import { pool } from "../config/database.js";
import { crearSesion, buscarSesion, cerrarSesion } from "../auth/sessions.js";
import { verificarContrasena } from "../auth/password.js";
import { NOMBRE_COOKIE } from "../auth/auth.middleware.js";

const OPCIONES_COOKIE = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api"
};

function obtenerDatosPublicos(usuario) {
    return {
        employeeId: usuario.employeeId,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        supervisorId: usuario.supervisorId
    };
}

export async function iniciarSesion(solicitud, respuesta) {
    const correo = typeof solicitud.body?.correo === "string"
        ? solicitud.body.correo.trim().toLowerCase()
        : "";
    const contrasena = solicitud.body?.contrasena;

    if (!correo || correo.length > 254 || typeof contrasena !== "string" || contrasena.length > 128) {
        return respuesta.status(400).json({
            estado: "error",
            mensaje: "Escribe un correo y una contraseña válidos."
        });
    }

    try {
        const [filas] = await pool.execute(
            "SELECT u.employee_id AS employeeId, u.nombre, u.correo, u.password_hash AS passwordHash, " +
            "u.supervisor_id AS supervisorId, r.nombre AS rol " +
            "FROM usuarios u INNER JOIN roles r ON r.rol_id = u.rol_id " +
            "WHERE u.correo = ? AND u.activo = TRUE LIMIT 1",
            [correo]
        );
        const usuario = filas[0];

        if (!usuario || usuario.rol !== "Coach" ||
            !await verificarContrasena(contrasena, usuario.passwordHash)) {
            return respuesta.status(401).json({
                estado: "error",
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const datosSesion = obtenerDatosPublicos(usuario);
        const sesion = crearSesion(datosSesion);
        respuesta.cookie(NOMBRE_COOKIE, sesion.token, {
            ...OPCIONES_COOKIE,
            maxAge: sesion.maxAge
        });

        return respuesta.json({ estado: "ok", datos: datosSesion });
    } catch (error) {
        console.error("No se pudo procesar el inicio de sesión:", error.message);
        return respuesta.status(500).json({
            estado: "error",
            mensaje: "No se pudo verificar el acceso. Inténtalo de nuevo."
        });
    }
}

export function consultarSesion(solicitud, respuesta) {
    const usuario = buscarSesion(solicitud.tokenSesion);
    if (!usuario) {
        return respuesta.status(401).json({ estado: "error", mensaje: "Inicia sesión para continuar." });
    }
    return respuesta.json({ estado: "ok", datos: obtenerDatosPublicos(usuario) });
}

export function cerrarSesionActual(solicitud, respuesta) {
    cerrarSesion(solicitud.tokenSesion);
    respuesta.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
    return respuesta.sendStatus(204);
}
