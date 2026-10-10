import { pool } from "../config/database.js";
import { crearHashContrasena, verificarContrasena } from "../auth/password.js";
import { crearSesion, cerrarSesion } from "../auth/sessions.js";
import { leerTokenSesion, NOMBRE_COOKIE } from "../auth/auth.middleware.js";

const OPCIONES_COOKIE = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api"
};
const MAX_INTENTOS = 5;
const VENTANA_INTENTOS = 15 * 60 * 1000;
const intentosPorIp = new Map();
const HASH_FALSO = await crearHashContrasena("clave ficticia solo para igualar tiempos");

function datosPublicos(usuario) {
    return { employeeId: usuario.employeeId, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol };
}

export async function iniciarSesion(solicitud, respuesta) {
    const correo = typeof solicitud.body?.correo === "string" ? solicitud.body.correo.trim().toLowerCase() : "";
    const contrasena = solicitud.body?.contrasena;
    if (!correo || correo.length > 254 || typeof contrasena !== "string" || contrasena.length > 128) {
        return respuesta.status(400).json({ estado: "error", mensaje: "Escribe un correo y una contraseña válidos." });
    }

    const ip = solicitud.ip;
    const previo = intentosPorIp.get(ip);
    const intento = previo && previo.venceEn > Date.now() ? previo : { total: 0, venceEn: Date.now() + VENTANA_INTENTOS };
    if (intento.total >= MAX_INTENTOS) {
        return respuesta.status(429).json({ estado: "error", mensaje: "Demasiados intentos. Espera 15 minutos." });
    }

    try {
        const [filas] = await pool.execute(
            "SELECT u.employee_id AS employeeId, u.nombre, u.correo, u.password_hash AS passwordHash, " +
            "r.nombre AS rol FROM usuarios u JOIN roles r ON r.rol_id = u.rol_id " +
            "WHERE u.correo = ? AND u.activo = TRUE LIMIT 1",
            [correo]
        );
        const usuario = filas[0];
        const claveCorrecta = await verificarContrasena(contrasena, usuario?.passwordHash || HASH_FALSO);
        if (!usuario || !["Coach", "Manager"].includes(usuario.rol) || !usuario.passwordHash || !claveCorrecta) {
            intento.total += 1;
            intentosPorIp.set(ip, intento);
            return respuesta.status(401).json({ estado: "error", mensaje: "Correo o contraseña incorrectos." });
        }

        intentosPorIp.delete(ip);
        cerrarSesion(leerTokenSesion(solicitud));
        const sesion = crearSesion(usuario.employeeId);
        respuesta.cookie(NOMBRE_COOKIE, sesion.token, { ...OPCIONES_COOKIE, maxAge: sesion.maxAge });
        return respuesta.json({ estado: "ok", datos: datosPublicos(usuario) });
    } catch (error) {
        console.error("No se pudo iniciar sesión:", error.message);
        return respuesta.status(500).json({ estado: "error", mensaje: "No se pudo verificar el acceso." });
    }
}

export function consultarSesion(solicitud, respuesta) {
    return respuesta.json({ estado: "ok", datos: datosPublicos(solicitud.usuario) });
}

export function cerrarSesionActual(solicitud, respuesta) {
    cerrarSesion(leerTokenSesion(solicitud));
    respuesta.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
    return respuesta.sendStatus(204);
}
