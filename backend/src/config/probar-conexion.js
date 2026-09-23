import { pool } from "./database.js";

try {
    const [filas] = await pool.query(
        "SELECT COUNT(*) AS total FROM roles"
    );

    console.log(`Conexión correcta. Roles registrados: ${filas[0].total}`);
} catch (error) {
    console.error("No se pudo conectar a MySQL:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}