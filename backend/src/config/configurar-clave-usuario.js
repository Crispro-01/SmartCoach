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

function preguntarSinMostrar(mensaje) {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
        throw new Error("Abre una terminal interactiva para configurar la contraseña.");
    }

    process.stdout.write(mensaje);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const decodificador = new StringDecoder("utf8");

    return new Promise(function (resolver, rechazar) {
        let texto = "";
        function recibir(fragmento) {
            const teclas = decodificador.write(fragmento);
            for (const tecla of teclas) {
                if (tecla === "\u0003") {
                    process.stdin.off("data", recibir);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write("\nConfiguración cancelada.\n");
                    rechazar(new Error("Operación cancelada."));
                    return;
                }

                if (tecla === "\r" || tecla === "\n") {
                    process.stdin.off("data", recibir);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write("\n");
                    resolver(texto);
                    return;
                }

                if (tecla === "\u0008" || tecla === "\u007f") {
                    texto = texto.slice(0, -1);
                } else if (tecla >= " ") {
                    texto += tecla;
                }
            }
        }
        process.stdin.on("data", recibir);
    });
}

try {
    const correo = (await preguntar("Correo del usuario Coach: ")).trim().toLowerCase();
    const [usuarios] = await pool.execute(
        "SELECT u.employee_id AS employeeId FROM usuarios u " +
        "INNER JOIN roles r ON r.rol_id = u.rol_id " +
        "WHERE u.correo = ? AND u.activo = TRUE AND r.nombre = 'Coach' LIMIT 1",
        [correo]
    );

    if (!usuarios.length) {
        throw new Error("No encontré una cuenta Coach activa con ese correo.");
    }

    const contrasena = await preguntarSinMostrar("Nueva contraseña (12 a 128 caracteres, no se mostrará): ");
    const confirmacion = await preguntarSinMostrar("Repítela para confirmar: ");
    if (contrasena !== confirmacion) throw new Error("Las contraseñas no coinciden.");

    const passwordHash = await crearHashContrasena(contrasena);
    await pool.execute(
        "UPDATE usuarios SET password_hash = ? WHERE employee_id = ?",
        [passwordHash, usuarios[0].employeeId]
    );
    console.log("Clave configurada. Se guardó su hash en MySQL; el texto no se escribió en el proyecto.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
    await pool.end();
}
