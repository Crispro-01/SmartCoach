import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COSTO = 131072;
const BLOQUE = 8;
const PARALELISMO = 1;
const LONGITUD_HASH = 32;
const OPCIONES = { N: COSTO, r: BLOQUE, p: PARALELISMO, maxmem: 256 * 1024 * 1024 };

export function validarContrasena(contrasena) {
    if (typeof contrasena !== "string" || contrasena.length < 12 || contrasena.length > 128) {
        throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
    }
}

export async function crearHashContrasena(contrasena) {
    validarContrasena(contrasena);
    const sal = randomBytes(16);
    const hash = await scrypt(contrasena, sal, LONGITUD_HASH, OPCIONES);
    return `scrypt$${COSTO}$${BLOQUE}$${PARALELISMO}$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verificarContrasena(contrasena, hashAlmacenado) {
    if (typeof contrasena !== "string" || contrasena.length > 128 || typeof hashAlmacenado !== "string") return false;
    const partes = hashAlmacenado.split("$");
    if (partes.length !== 6 || partes[0] !== "scrypt" || Number(partes[1]) !== COSTO ||
        Number(partes[2]) !== BLOQUE || Number(partes[3]) !== PARALELISMO) return false;

    try {
        const sal = Buffer.from(partes[4], "base64url");
        const esperado = Buffer.from(partes[5], "base64url");
        if (sal.length !== 16 || esperado.length !== LONGITUD_HASH) return false;
        const calculado = await scrypt(contrasena, sal, LONGITUD_HASH, OPCIONES);
        return timingSafeEqual(calculado, esperado);
    } catch {
        return false;
    }
}
