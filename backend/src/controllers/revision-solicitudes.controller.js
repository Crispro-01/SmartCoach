import { pool } from "../config/database.js";

class ErrorRevision extends Error {
    constructor(mensaje, estado) {
        super(mensaje);
        this.estado = estado;
    }
}

// Solo se listan solicitudes de Coaches cuyo superior directo es este Manager.
export async function listarSolicitudesRevision(solicitud, respuesta) {
    try {
        const [filas] = await pool.execute(
            "SELECT q.solicitud_id AS id, q.sesion_id AS sesionId, q.motivo, q.estado, " +
            "DATE_FORMAT(q.fecha_solicitud, '%d/%m/%Y %H:%i') AS fechaSolicitud, " +
            "DATE_FORMAT(q.fecha_resolucion, '%d/%m/%Y %H:%i') AS fechaResolucion, " +
            "q.respuesta_revision AS respuestaRevision, r.nombre AS revisorNombre, " +
            "s.agente_id AS agenteId, a.nombre AS agenteNombre, " +
            "s.coach_id AS coachId, c.nombre AS coachNombre, s.tema " +
            "FROM solicitudes_eliminacion_sesion q " +
            "JOIN sesiones s ON s.sesion_id = q.sesion_id " +
            "JOIN usuarios a ON a.employee_id = s.agente_id " +
            "JOIN usuarios c ON c.employee_id = s.coach_id " +
            "LEFT JOIN usuarios r ON r.employee_id = q.revisado_por " +
            "WHERE c.supervisor_id = ? AND q.solicitante_coach_id = s.coach_id " +
            "ORDER BY (q.estado = 'PENDIENTE') DESC, q.fecha_solicitud DESC, q.solicitud_id DESC LIMIT 100",
            [solicitud.usuario.employeeId]
        );
        return respuesta.json({ estado: "ok", datos: filas });
    } catch (error) {
        console.error("No se pudieron consultar las solicitudes:", error.message);
        return respuesta.status(500).json({ estado: "error", mensaje: "No se pudieron consultar las solicitudes." });
    }
}

// Aprobar archiva el Coaching en la vista normal; no borra filas de MySQL.
export async function resolverSolicitudRevision(solicitud, respuesta) {
    const id = Number(solicitud.params.id);
    const decision = solicitud.body?.decision;
    const justificacion = typeof solicitud.body?.justificacion === "string"
        ? solicitud.body.justificacion.trim() : "";
    if (!Number.isSafeInteger(id) || id < 1 || !["APROBADA", "RECHAZADA"].includes(decision) ||
        justificacion.length < 20 || justificacion.length > 1000) {
        return respuesta.status(400).json({
            estado: "error",
            mensaje: "Indica una decisión válida y una justificación de 20 a 1000 caracteres."
        });
    }

    let conexion;
    let iniciada = false;
    try {
        conexion = await pool.getConnection();
        await conexion.beginTransaction();
        iniciada = true;
        const [filas] = await conexion.execute(
            "SELECT q.estado, e.codigo AS estadoSesion, t.codigo AS tipoSesion " +
            "FROM solicitudes_eliminacion_sesion q " +
            "JOIN sesiones s ON s.sesion_id = q.sesion_id " +
            "JOIN usuarios c ON c.employee_id = s.coach_id " +
            "JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
            "JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
            "WHERE q.solicitud_id = ? AND c.supervisor_id = ? " +
            "AND q.solicitante_coach_id = s.coach_id FOR UPDATE",
            [id, solicitud.usuario.employeeId]
        );
        if (!filas.length) throw new ErrorRevision("No se encontró una solicitud de tu equipo.", 404);
        if (filas[0].estado !== "PENDIENTE") throw new ErrorRevision("Esta solicitud ya fue resuelta.", 409);
        if (filas[0].estadoSesion !== "COMPLETADA" || filas[0].tipoSesion !== "COACHING") {
            throw new ErrorRevision("La sesión ya no cumple las condiciones para esta revisión.", 409);
        }

        const [cambio] = await conexion.execute(
            "UPDATE solicitudes_eliminacion_sesion SET estado = ?, fecha_resolucion = NOW(), " +
            "revisado_por = ?, respuesta_revision = ? WHERE solicitud_id = ? AND estado = 'PENDIENTE'",
            [decision, solicitud.usuario.employeeId, justificacion, id]
        );
        if (cambio.affectedRows !== 1) throw new ErrorRevision("Esta solicitud ya fue resuelta.", 409);
        await conexion.commit();
        iniciada = false;
        return respuesta.json({
            estado: "ok",
            mensaje: decision === "APROBADA"
                ? "Solicitud aprobada. El Coaching se archivó sin borrar su historial."
                : "Solicitud rechazada. El Coaching sigue visible.",
            datos: { solicitudId: String(id), estado: decision }
        });
    } catch (error) {
        if (iniciada && conexion) {
            try { await conexion.rollback(); } catch (fallo) {
                console.error("No se pudo revertir la revisión:", fallo.message);
            }
        }
        if (!(error instanceof ErrorRevision)) console.error("No se pudo resolver la solicitud:", error.message);
        return respuesta.status(error.estado || 500).json({
            estado: "error",
            mensaje: error instanceof ErrorRevision ? error.message : "No se pudo resolver la solicitud."
        });
    } finally {
        if (conexion) conexion.release();
    }
}
