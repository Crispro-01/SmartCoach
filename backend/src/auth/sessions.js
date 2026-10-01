import { createHash, randomBytes } from "node:crypto";

const DURACION_MILISEGUNDOS = 8 * 60 * 60 * 1000;
const sesionesActivas = new Map();

function resumirToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

export function crearSesion(usuario) {
    const token = randomBytes(32).toString("base64url");
    const venceEn = Date.now() + DURACION_MILISEGUNDOS;
    sesionesActivas.set(resumirToken(token), { usuario, venceEn });
    return { token, maxAge: DURACION_MILISEGUNDOS };
}

export function buscarSesion(token) {
    if (typeof token !== "string" || !token) return null;

    const clave = resumirToken(token);
    const sesion = sesionesActivas.get(clave);
    if (!sesion) return null;
    if (sesion.venceEn <= Date.now()) {
        sesionesActivas.delete(clave);
        return null;
    }
    return sesion.usuario;
}

export function cerrarSesion(token) {
    if (typeof token !== "string" || !token) return;
    sesionesActivas.delete(resumirToken(token));
}
