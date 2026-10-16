import { pool } from "../config/database.js";

export async function listarHistorial(solicitud, respuesta) {
    try {
        // El Coach solo consulta sesiones propias de agentes activos que siguen en su equipo.
        // NOT EXISTS conserva las pendientes/rechazadas y oculta únicamente las aprobadas.
        const [filas] = await pool.execute(
            `SELECT
                CAST(sesion.sesion_id AS CHAR) AS id,
                agente.employee_id AS agenteId,
                agente.nombre AS agenteNombre,
                DATE_FORMAT(sesion.fecha_creacion, '%d/%m/%Y') AS fecha,
                tipo.nombre AS tipo,
                LOWER(REPLACE(tipo.codigo, '_', '-')) AS clase,
                estado.nombre AS estado
            FROM sesiones AS sesion
            INNER JOIN usuarios AS agente ON agente.employee_id = sesion.agente_id
            INNER JOIN roles AS rol ON rol.rol_id = agente.rol_id
            INNER JOIN tipos_sesion AS tipo ON tipo.tipo_sesion_id = sesion.tipo_sesion_id
            INNER JOIN estados_sesion AS estado ON estado.estado_sesion_id = sesion.estado_sesion_id
            WHERE sesion.coach_id = ? AND agente.supervisor_id = ?
                AND agente.activo = TRUE AND rol.nombre = 'Agente'
                AND tipo.codigo = 'COACHING' AND estado.codigo IN ('BORRADOR', 'COMPLETADA')
                AND NOT EXISTS (
                    SELECT 1 FROM solicitudes_eliminacion_sesion AS archivo
                    WHERE archivo.sesion_id = sesion.sesion_id AND archivo.estado = 'APROBADA'
                )
            ORDER BY sesion.fecha_creacion DESC, sesion.sesion_id DESC`,
            [solicitud.usuario.employeeId, solicitud.usuario.employeeId]
        );
        return respuesta.json({ estado: "ok", total: filas.length, datos: filas });
    } catch (error) {
        console.error("Error al consultar el historial:", error.message);
        return respuesta.status(500).json({
            estado: "error",
            mensaje: "No se pudo consultar el historial. Intenta de nuevo."
        });
    }
}
