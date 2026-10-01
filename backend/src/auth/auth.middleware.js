import { buscarSesion } from "./sessions.js";

const NOMBRE_COOKIE = "smart_coach_sesion";

function leerCookie(solicitud, nombre) {
    const cookies = solicitud.headers.cookie ?? "";
    const cookie = cookies.split(";").map(function (valor) {
        return valor.trim();
    }).find(function (valor) {
        return valor.startsWith(`${nombre}=`);
    });

    return cookie ? cookie.slice(nombre.length + 1) : "";
}

export function exigirAutenticacion(solicitud, respuesta, siguiente) {
    const token = leerCookie(solicitud, NOMBRE_COOKIE);
    const usuario = buscarSesion(token);
    if (!usuario) {
        return respuesta.status(401).json({
            estado: "error",
            mensaje: "Inicia sesión para continuar."
        });
    }

    solicitud.usuario = usuario;
    solicitud.tokenSesion = token;
    return siguiente();
}

export function exigirRol(rolPermitido) {
    return function (solicitud, respuesta, siguiente) {
        if (solicitud.usuario?.rol !== rolPermitido) {
            return respuesta.status(403).json({
                estado: "error",
                mensaje: "Tu cuenta no tiene permiso para esta función."
            });
        }
        return siguiente();
    };
}

export { NOMBRE_COOKIE };
