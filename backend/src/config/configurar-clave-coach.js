import "dotenv/config";
import { createInterface } from "node:readline";
import { StringDecoder } from "node:string_decoder";
import { pool } from "./database.js";
import { crearHashContrasena } from "../auth/password.js";

function preguntar(mensaje) {
    const lector = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(function (resolver) {
        lector.question(mensaje, function (respuesta) {
            lector.close();
            resolver(respuesta);
        });
    });
}

function preguntarOculto(mensaje) {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
        throw new Error("Abre una terminal interactiva para elegir tu contraseña.");
    }
    process.stdout.write(mensaje);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const decodificador = new StringDecoder("utf8");
    return new Promise(function (resolver, rechazar) {
        let respuesta = "";
        function recibir(fragmento) {
            for (const tecla of decodificador.write(fragmento)) {
                if (tecla === "\u0003") {
                    process.stdin.off("data", recibir);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write("\n");
                    rechazar(new Error("Operación cancelada."));
                    return;
                }
                if (tecla === "\r" || tecla === "\n") {
                    process.stdin.off("data", recibir);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write("\n");
                    resolver(respuesta);
                    return;
                }
                if (tecla === "\u0008" || tecla === "\u007f") {
                    respuesta = respuesta.slice(0, -1);
                } else if (tecla >= " " && tecla !== "\u007f") {
                    respuesta += tecla;
                }
            }
        }
        process.stdin.on("data", recibir);
    });
}

try {
    const rol = process.argv[2] || "Coach";
    if (!["Coach", "Manager"].includes(rol)) throw new Error("Indica Coach o Manager como rol.");
    const predeterminado = rol === "Manager" ? "MGR001" : "COACH001";
    const id = (await preguntar(`ID del ${rol} de demostración (${predeterminado}): `)).trim() || predeterminado;
    const [usuarios] = await pool.execute(
        "SELECT u.employee_id AS id, u.nombre FROM usuarios u " +
        "JOIN roles r ON r.rol_id = u.rol_id " +
        "WHERE u.employee_id = ? AND u.activo = TRUE AND r.nombre = ? " +
        "AND u.password_hash IS NULL",
        [id, rol]
    );
    if (!usuarios.length) throw new Error(`No existe un ${rol} activo sin contraseña con ese ID.`);

    console.log(`Cuenta: ${usuarios[0].nombre}. La contraseña no se mostrará ni se guardará en texto.`);
    const contrasena = await preguntarOculto("Elige una contraseña de 12 a 128 caracteres: ");
    const confirmacion = await preguntarOculto("Repítela para confirmar: ");
    if (contrasena !== confirmacion) throw new Error("Las contraseñas no coinciden.");

    const hash = await crearHashContrasena(contrasena);
    const [cambio] = await pool.execute(
        "UPDATE usuarios SET password_hash = ? WHERE employee_id = ? AND password_hash IS NULL",
        [hash, id]
    );
    if (cambio.affectedRows !== 1) throw new Error("La cuenta ya fue configurada. No se reemplazó la contraseña.");
    console.log("Contraseña configurada. MySQL guardó solamente su hash.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    await pool.end();
}
