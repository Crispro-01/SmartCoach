import { pool } from "../config/database.js";

async function consultarAgentes(filtros) {
    const condiciones = ["rol.nombre = ?", "usuario.activo = TRUE"];
    const parametros = ["Agente"];

    if (filtros.supervisorId) {
        condiciones.push("usuario.supervisor_id = ?");
        parametros.push(filtros.supervisorId);
    }

    if (filtros.employeeId) {
        condiciones.push("usuario.employee_id = ?");
        parametros.push(filtros.employeeId);
    }

    const [filas] = await pool.execute(
        `SELECT
            usuario.employee_id AS id,
            usuario.nombre,
            usuario.correo,
            usuario.supervisor_id AS supervisorId,
            sesion.sesion_id AS sesionId,
            DATE_FORMAT(sesion.fecha_creacion, '%d/%m/%Y') AS fecha,
            tipo.nombre AS tipo,
            LOWER(REPLACE(tipo.codigo, '_', '-')) AS clase,
            sesion.tema,
            estado.nombre AS estado
        FROM usuarios AS usuario
        INNER JOIN roles AS rol
            ON rol.rol_id = usuario.rol_id
        LEFT JOIN sesiones AS sesion
            ON sesion.agente_id = usuario.employee_id
        LEFT JOIN tipos_sesion AS tipo
            ON tipo.tipo_sesion_id = sesion.tipo_sesion_id
        LEFT JOIN estados_sesion AS estado
            ON estado.estado_sesion_id = sesion.estado_sesion_id
        WHERE ${condiciones.join(" AND ")}
        ORDER BY usuario.nombre ASC, sesion.fecha_creacion DESC, sesion.sesion_id DESC`,
        parametros
    );

    const agentesPorId = new Map();

    for (const fila of filas) {
        let agente = agentesPorId.get(fila.id);

        if (!agente) {
            agente = {
                id: fila.id,
                nombre: fila.nombre,
                correo: fila.correo,
                supervisorId: fila.supervisorId,
                sesiones: []
            };
            agentesPorId.set(fila.id, agente);
        }

        if (fila.sesionId !== null) {
            agente.sesiones.push({
                id: String(fila.sesionId),
                agenteId: fila.id,
                fecha: fila.fecha,
                tipo: fila.tipo,
                clase: fila.clase,
                tema: fila.tema,
                estado: fila.estado
            });
        }
    }

    return Array.from(agentesPorId.values());
}

function responderError(respuesta, error) {
    console.error("Error al consultar agentes:", error.message);

    return respuesta.status(500).json({
        estado: "error",
        mensaje: "No se pudieron consultar los agentes"
    });
}

export async function listarAgentes(solicitud, respuesta) {
    try {
        const supervisorId = solicitud.query.supervisorId;
        const filtros = {
            supervisorId: typeof supervisorId === "string" ? supervisorId.trim() : ""
        };
        const datos = await consultarAgentes(filtros);

        return respuesta.json({
            total: datos.length,
            datos
        });
    } catch (error) {
        return responderError(respuesta, error);
    }
}

export async function obtenerAgentePorId(solicitud, respuesta) {
    try {
        const [agente] = await consultarAgentes({
            employeeId: solicitud.params.id
        });

        if (!agente) {
            return respuesta.status(404).json({
                estado: "error",
                mensaje: "Agente no encontrado"
            });
        }

        return respuesta.json({
            estado: "ok",
            datos: agente
        });
    } catch (error) {
        return responderError(respuesta, error);
    }
}
