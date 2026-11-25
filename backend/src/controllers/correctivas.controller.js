import { pool } from "../config/database.js";
import { solicitarEliminacionCoaching } from "./solicitudes-eliminacion.controller.js";

const tipos = Object.freeze({
    accountability: { codigo: "ACCOUNTABILITY", nombre: "Accountability" },
    "verbal-warning": { codigo: "VERBAL_WARNING", nombre: "Verbal Warning" }
});

class ErrorCorrectiva extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}

function tipoCorrectiva(solicitud) {
    if (!Object.hasOwn(tipos, solicitud.params.tipo)) throw new ErrorCorrectiva("Tipo de sesión correctiva inválido.");
    return tipos[solicitud.params.tipo];
}

function identificador(valor) {
    const numero = Number(valor);
    if (!["number", "string"].includes(typeof valor) || !Number.isSafeInteger(numero) || numero < 1) {
        throw new ErrorCorrectiva("Indica un identificador válido.");
    }
    return numero;
}

function texto(valor, nombre, maximo) {
    if (typeof valor !== "string" || !valor.trim() || valor.trim().length > maximo) throw new ErrorCorrectiva(`Revisa el campo ${nombre}.`);
    return valor.trim();
}

function contenido(cuerpo) {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) throw new ErrorCorrectiva("Contenido inválido.");
    texto(cuerpo.agentId, "agente", 32);
    const json = JSON.stringify(cuerpo);
    if (Buffer.byteLength(json, "utf8") > 20000) throw new ErrorCorrectiva("El contenido supera el tamaño permitido.");
    return json;
}

async function agenteAsignado(conexion, agenteId, coachId) {
    const [filas] = await conexion.execute(
        "SELECT a.employee_id FROM usuarios a JOIN roles r ON r.rol_id = a.rol_id " +
        "WHERE a.employee_id = ? AND a.supervisor_id = ? AND a.activo = TRUE AND r.nombre = 'Agente'",
        [texto(agenteId, "agente", 32), coachId]);
    if (!filas.length) throw new ErrorCorrectiva("No se encontró un agente activo de tu equipo.", 404);
}

async function consultarBorrador(conexion, sesionId, agenteId, coachId, codigo, bloquear) {
    const [filas] = await conexion.execute(
        "SELECT s.sesion_id AS id, s.borrador_json AS contenido, e.codigo AS estado " +
        "FROM sesiones s JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
        "JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
        "WHERE s.sesion_id = ? AND s.agente_id = ? AND s.coach_id = ? AND t.codigo = ?" +
        (bloquear ? " FOR UPDATE" : ""), [identificador(sesionId), agenteId, coachId, codigo]);
    if (!filas.length) throw new ErrorCorrectiva("No se encontró la sesión incompleta de este tipo.", 404);
    if (filas[0].estado !== "BORRADOR") throw new ErrorCorrectiva("Esta sesión está completada y no se puede modificar.", 409);
    return filas[0];
}

function operacion(accion) {
    return async function (solicitud, respuesta) {
        let conexion;
        let transaccion = false;
        try {
            // El tipo lo fija la ruta validada; nunca el cuerpo enviado por el navegador.
            const tipo = tipoCorrectiva(solicitud);
            const lectura = accion === "leer";
            const agenteId = lectura ? solicitud.query.agenteId : solicitud.body?.agentId;
            const json = ["guardar", "actualizar"].includes(accion) ? contenido(solicitud.body) : null;
            let datos;
            if (accion === "completar") {
                contenido(solicitud.body);
                datos = [texto(solicitud.body.cause, "situación o dificultad", 1500),
                    texto(solicitud.body.agentCommitment, "compromiso del representante", 1500),
                    texto(solicitud.body.coachCommitment, "compromiso del Coach", 1500)];
            }
            conexion = await pool.getConnection();
            if (!lectura) { await conexion.beginTransaction(); transaccion = true; }
            await agenteAsignado(conexion, agenteId, solicitud.usuario.employeeId);
            let sesionId;
            if (["leer", "actualizar", "descartar"].includes(accion) || (accion === "completar" && solicitud.body?.draftId != null)) {
                const fila = await consultarBorrador(conexion, solicitud.params.id ?? solicitud.body.draftId,
                    agenteId, solicitud.usuario.employeeId, tipo.codigo, !lectura);
                sesionId = fila.id;
                if (lectura) return respuesta.json({ estado: "ok", datos: { sesionId: String(sesionId),
                    contenido: typeof fila.contenido === "string" ? JSON.parse(fila.contenido) : fila.contenido } });
            }
            if (accion === "descartar") {
                await conexion.execute("DELETE FROM sesiones WHERE sesion_id = ?", [sesionId]);
            } else if (accion === "actualizar") {
                await conexion.execute("UPDATE sesiones SET borrador_json = ? WHERE sesion_id = ?", [json, sesionId]);
            } else {
                const [catalogos] = await conexion.execute(
                    "SELECT t.tipo_sesion_id, e.estado_sesion_id FROM tipos_sesion t CROSS JOIN estados_sesion e " +
                    "WHERE t.codigo = ? AND e.codigo = ?", [tipo.codigo, datos ? "COMPLETADA" : "BORRADOR"]);
                if (!catalogos.length) throw new ErrorCorrectiva("Faltan los catálogos de la sesión correctiva.", 500);
                if (sesionId) {
                    await conexion.execute(
                        "UPDATE sesiones SET estado_sesion_id = ?, tema = ?, fecha_completada = CURRENT_TIMESTAMP, " +
                        "borrador_json = NULL WHERE sesion_id = ?", [catalogos[0].estado_sesion_id, tipo.nombre, sesionId]);
                } else {
                    const [nueva] = await conexion.execute(
                        "INSERT INTO sesiones (agente_id, coach_id, tipo_sesion_id, estado_sesion_id, tema, borrador_json, fecha_completada) " +
                        "VALUES (?, ?, ?, ?, ?, ?, " + (datos ? "CURRENT_TIMESTAMP" : "NULL") + ")",
                        [agenteId, solicitud.usuario.employeeId, catalogos[0].tipo_sesion_id, catalogos[0].estado_sesion_id, tipo.nombre, json]);
                    sesionId = nueva.insertId;
                }
                if (datos) await conexion.execute(
                    "INSERT INTO sesiones_correctivas (sesion_id, causa_situacion, compromiso_representante, compromiso_coach) " +
                    "VALUES (?, ?, ?, ?)", [sesionId, ...datos]);
            }
            await conexion.commit(); transaccion = false;
            return respuesta.status(["guardar", "completar"].includes(accion) ? 201 : 200)
                .json({ estado: "ok", datos: { sesionId: String(sesionId) } });
        } catch (error) {
            console.error(`No se pudo ${accion} la sesión correctiva:`, error.message);
            return respuesta.status(error.status || 500).json({ estado: "error",
                mensaje: error.status ? error.message : "No se pudo gestionar la sesión correctiva. Intenta de nuevo." });
        } finally {
            if (transaccion && conexion) {
                try { await conexion.rollback(); } catch (error) { console.error("No se pudo revertir la sesión correctiva:", error.message); }
            }
            if (conexion) conexion.release();
        }
    };
}

export const crearBorradorCorrectiva = operacion("guardar");
export const obtenerBorradorCorrectiva = operacion("leer");
export const actualizarBorradorCorrectiva = operacion("actualizar");
export const descartarBorradorCorrectiva = operacion("descartar");
export const completarCorrectiva = operacion("completar");

export async function consultarCorrectiva(solicitud, respuesta) {
    let conexion;
    try {
        const tipo = tipoCorrectiva(solicitud);
        const sesionId = identificador(solicitud.params.id);
        const agenteId = texto(solicitud.query.agenteId, "agente", 32);
        const manager = solicitud.usuario.rol === "Manager";
        conexion = await pool.getConnection();
        const [filas] = await conexion.execute(
            "SELECT s.sesion_id AS id, s.agente_id AS agenteId, a.nombre AS agenteNombre, c.nombre AS coachNombre, t.nombre AS tipo, " +
            "DATE_FORMAT(s.fecha_creacion, '%d/%m/%Y %H:%i') AS fechaCreacion, " +
            "DATE_FORMAT(s.fecha_completada, '%d/%m/%Y %H:%i') AS fechaCompletada, " +
            "d.causa_situacion AS causa, d.compromiso_representante AS compromisoAgente, d.compromiso_coach AS compromisoCoach " +
            "FROM sesiones s JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
            "JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
            "JOIN sesiones_correctivas d ON d.sesion_id = s.sesion_id JOIN usuarios a ON a.employee_id = s.agente_id " +
            "JOIN usuarios c ON c.employee_id = s.coach_id " +
            "WHERE s.sesion_id = ? AND s.agente_id = ? AND " + (manager ? "c.supervisor_id" : "s.coach_id") + " = ? " +
            "AND t.codigo = ? AND e.codigo = 'COMPLETADA'" +
            (manager ? "" : " AND a.supervisor_id = s.coach_id AND a.activo = TRUE AND NOT EXISTS " +
                "(SELECT 1 FROM solicitudes_eliminacion_sesion q WHERE q.sesion_id = s.sesion_id AND q.estado = 'APROBADA')"),
            [sesionId, agenteId, solicitud.usuario.employeeId, tipo.codigo]);
        if (!filas.length) throw new ErrorCorrectiva("No se encontró una sesión completada de este tipo para el agente.", 404);
        const [solicitudes] = await conexion.execute(
            "SELECT estado, motivo, respuesta_revision AS respuestaRevision, " +
            "DATE_FORMAT(fecha_solicitud, '%d/%m/%Y %H:%i') AS fechaSolicitud " +
            "FROM solicitudes_eliminacion_sesion WHERE sesion_id = ? ORDER BY solicitud_id DESC LIMIT 1", [sesionId]);
        return respuesta.json({ estado: "ok", datos: { ...filas[0], solicitudEliminacion: solicitudes[0] || null } });
    } catch (error) {
        console.error("No se pudo consultar la sesión correctiva:", error.message);
        return respuesta.status(error.status || 500).json({ estado: "error",
            mensaje: error.status ? error.message : "No se pudo consultar la sesión correctiva." });
    } finally { if (conexion) conexion.release(); }
}

export async function solicitarEliminacionCorrectiva(solicitud, respuesta) {
    let tipo;
    try { tipo = tipoCorrectiva(solicitud); }
    catch (error) { return respuesta.status(400).json({ estado: "error", mensaje: error.message }); }
    return solicitarEliminacionCoaching(solicitud, respuesta, tipo.codigo);
}
