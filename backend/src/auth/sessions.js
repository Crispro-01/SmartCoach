import { createHash, randomBytes } from "node:crypto";

const DURACION_MILISEGUNDOS = 8 * 60 * 60 * 1000;
const sesionesActivas = new Map();

function claveToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

export function crearSesion(employeeId) {
    const token = randomBytes(32).toString("base64url");
    sesionesActivas.set(claveToken(token), {
        employeeId,
        venceEn: Date.now() + DURACION_MILISEGUNDOS
    });
    return { token, maxAge: DURACION_MILISEGUNDOS };
}

export function buscarSesion(token) {
    if (typeof token !== "string" || !token) return null;
    const clave = claveToken(token);
    const sesion = sesionesActivas.get(clave);
    if (!sesion) return null;
    if (sesion.venceEn <= Date.now()) {
        sesionesActivas.delete(clave);
        return null;
    }
    return sesion;
}

export function cerrarSesion(token) {
    if (typeof token === "string" && token) sesionesActivas.delete(claveToken(token));
}
