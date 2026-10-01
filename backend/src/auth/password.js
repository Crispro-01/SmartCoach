import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COSTO = 16384;
const BLOQUE = 8;
const PARALELISMO = 1;
const LONGITUD_HASH = 32;
const OPCIONES = { N: COSTO, r: BLOQUE, p: PARALELISMO, maxmem: 64 * 1024 * 1024 };

export function validarContrasena(contrasena) {
    if (typeof contrasena !== "string" || contrasena.length < 12 || contrasena.length > 128) {
        throw new Error("Usa una contraseña de entre 12 y 128 caracteres.");
    }
}

export async function crearHashContrasena(contrasena) {
    validarContrasena(contrasena);
    const sal = randomBytes(16);
    const hash = await scrypt(contrasena, sal, LONGITUD_HASH, OPCIONES);
    return `scrypt$${COSTO}$${BLOQUE}$${PARALELISMO}$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verificarContrasena(contrasena, hashAlmacenado) {
    if (typeof contrasena !== "string" || typeof hashAlmacenado !== "string") return false;

    const [algoritmo, costo, bloque, paralelismo, salTexto, hashTexto, extra] = hashAlmacenado.split("$");
    if (extra !== undefined || algoritmo !== "scrypt" || Number(costo) !== COSTO ||
        Number(bloque) !== BLOQUE || Number(paralelismo) !== PARALELISMO) {
        return false;
    }

    try {
        const sal = Buffer.from(salTexto, "base64url");
        const hashEsperado = Buffer.from(hashTexto, "base64url");
        if (sal.length !== 16 || hashEsperado.length !== LONGITUD_HASH) return false;

        const hashCalculado = await scrypt(contrasena, sal, LONGITUD_HASH, OPCIONES);
        return timingSafeEqual(hashCalculado, hashEsperado);
    } catch {
        return false;
    }
}
