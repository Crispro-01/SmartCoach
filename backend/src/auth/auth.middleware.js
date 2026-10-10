import { pool } from "../config/database.js";
import { buscarSesion } from "./sessions.js";

export const NOMBRE_COOKIE = "smart_coach_sesion";

export function leerTokenSesion(solicitud) {
    const cookies = solicitud.headers.cookie ?? "";
    const entrada = cookies.split(";").map(function (parte) { return parte.trim(); })
        .find(function (parte) { return parte.startsWith(`${NOMBRE_COOKIE}=`); });
    return entrada ? entrada.slice(NOMBRE_COOKIE.length + 1) : "";
}

export async function exigirCoach(solicitud, respuesta, siguiente) {
    const token = leerTokenSesion(solicitud);
    const sesion = buscarSesion(token);
    if (!sesion) {
        return respuesta.status(401).json({ estado: "error", mensaje: "Inicia sesión para continuar." });
    }
    try {
        const [usuarios] = await pool.execute(
            "SELECT u.employee_id AS employeeId, u.nombre, u.correo, r.nombre AS rol " +
            "FROM usuarios u JOIN roles r ON r.rol_id = u.rol_id " +
            "WHERE u.employee_id = ? AND u.activo = TRUE LIMIT 1",
            [sesion.employeeId]
        );
        if (!usuarios.length || usuarios[0].rol !== "Coach") {
            return respuesta.status(403).json({ estado: "error", mensaje: "Esta cuenta no tiene permiso de Coach." });
        }
        solicitud.usuario = usuarios[0];
        solicitud.tokenSesion = token;
        return siguiente();
    } catch (error) {
        console.error("No se pudo verificar la sesión:", error.message);
        return respuesta.status(500).json({ estado: "error", mensaje: "No se pudo verificar la sesión." });
    }
}
