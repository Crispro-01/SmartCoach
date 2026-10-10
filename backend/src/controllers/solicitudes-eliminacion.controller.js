import { pool } from "../config/database.js";

// Una solicitud deja constancia del motivo. Esta ruta no borra ninguna sesión.
export async function solicitarEliminacionCoaching(solicitud, respuesta) {
    const id = Number(solicitud.params.id);
    const motivo = typeof solicitud.body?.motivo === "string" ? solicitud.body.motivo.trim() : "";
    if (!Number.isSafeInteger(id) || id < 1 || motivo.length < 20 || motivo.length > 1000) {
        return respuesta.status(400).json({
            estado: "error",
            mensaje: "Indica una sesión válida y un motivo de 20 a 1000 caracteres."
        });
    }

    let conexion;
    let iniciada = false;
    try {
        conexion = await pool.getConnection();
        await conexion.beginTransaction();
        iniciada = true;

        // El bloqueo de la sesión evita dos solicitudes simultáneas para el mismo Coaching.
        const [sesiones] = await conexion.execute(
            "SELECT e.codigo AS estado FROM sesiones s " +
            "JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
            "JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
            "WHERE s.sesion_id = ? AND s.coach_id = ? AND t.codigo = 'COACHING' FOR UPDATE",
            [id, solicitud.usuario.employeeId]
        );
        if (!sesiones.length) {
            return respuesta.status(404).json({ estado: "error", mensaje: "No se encontró este Coaching en tu equipo." });
        }
        if (sesiones[0].estado !== "COMPLETADA") {
            return respuesta.status(409).json({ estado: "error", mensaje: "Solo se puede solicitar la eliminación de una sesión completada." });
        }

        const [anteriores] = await conexion.execute(
            "SELECT estado FROM solicitudes_eliminacion_sesion WHERE sesion_id = ? " +
            "ORDER BY solicitud_id DESC LIMIT 1",
            [id]
        );
        if (anteriores[0]?.estado === "PENDIENTE" || anteriores[0]?.estado === "APROBADA") {
            return respuesta.status(409).json({ estado: "error", mensaje: "Esta sesión ya tiene una solicitud pendiente o aprobada." });
        }

        const [resultado] = await conexion.execute(
            "INSERT INTO solicitudes_eliminacion_sesion (sesion_id, solicitante_coach_id, motivo) VALUES (?, ?, ?)",
            [id, solicitud.usuario.employeeId, motivo]
        );
        await conexion.commit();
        iniciada = false;
        return respuesta.status(201).json({
            estado: "ok",
            mensaje: "Solicitud registrada para revisión. La sesión sigue disponible y no se ha eliminado.",
            datos: { solicitudId: String(resultado.insertId), estado: "PENDIENTE" }
        });
    } catch (error) {
        console.error("No se pudo registrar la solicitud de eliminación:", error.message);
        return respuesta.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
            estado: "error",
            mensaje: error.code === "ER_DUP_ENTRY"
                ? "Esta sesión ya tiene una solicitud pendiente."
                : "No se pudo registrar la solicitud."
        });
    } finally {
        if (iniciada && conexion) {
            try { await conexion.rollback(); } catch (error) {
                console.error("No se pudo revertir la solicitud:", error.message);
            }
        }
        if (conexion) conexion.release();
    }
}
