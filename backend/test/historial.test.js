import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { pool } from "../src/config/database.js";
import { listarHistorial } from "../src/controllers/historial.controller.js";
import rutasCoaching from "../src/routes/coaching.routes.js";
import { exigirCoach } from "../src/auth/auth.middleware.js";
import { crearSesion, cerrarSesion } from "../src/auth/sessions.js";

function respuestaDePrueba() {
    return {
        codigo: 200,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };
}

test("historial limita Coach y equipo, excluye aprobadas y ordena por fecha e ID", async function () {
    const original = pool.execute;
    const filas = [{ id: "9007199254740993", agenteId: "TM001", estado: "Completada" }];
    let consulta;
    pool.execute = async function (sql, parametros) {
        consulta = { sql, parametros };
        return [filas];
    };
    const respuesta = respuestaDePrueba();
    try {
        await listarHistorial({ usuario: { employeeId: "COACH001" } }, respuesta);
    } finally { pool.execute = original; }
    assert.deepEqual(consulta.parametros, ["COACH001", "COACH001"]);
    assert.match(consulta.sql, /sesion\.coach_id = \? AND agente\.supervisor_id = \?/);
    assert.match(consulta.sql, /agente\.activo = TRUE AND rol\.nombre = 'Agente'/);
    assert.match(consulta.sql, /NOT EXISTS[\s\S]*archivo\.estado = 'APROBADA'/);
    assert.match(consulta.sql, /ORDER BY sesion\.fecha_creacion DESC, sesion\.sesion_id DESC/);
    assert.match(consulta.sql, /CAST\(sesion\.sesion_id AS CHAR\)/);
    assert.deepEqual(respuesta.cuerpo, { estado: "ok", total: 1, datos: filas });
});

test("historial sin sesiones devuelve lista vacía y no un error", async function () {
    const original = pool.execute;
    pool.execute = async function () { return [[]]; };
    const respuesta = respuestaDePrueba();
    try {
        await listarHistorial({ usuario: { employeeId: "COACH002" } }, respuesta);
    } finally { pool.execute = original; }
    assert.deepEqual(respuesta.cuerpo, { estado: "ok", total: 0, datos: [] });
});

test("historial responde 500 sin revelar detalles SQL al usuario", async function () {
    const original = pool.execute;
    pool.execute = async function () { throw new Error("Fallo simulado de conexión"); };
    const respuesta = respuestaDePrueba();
    try {
        await listarHistorial({ usuario: { employeeId: "COACH001" } }, respuesta);
    } finally { pool.execute = original; }
    assert.equal(respuesta.codigo, 500);
    assert.equal(respuesta.cuerpo.mensaje, "No se pudo consultar el historial. Intenta de nuevo.");
});

test("ruta de historial exige autenticación, rechaza Manager y permite Coach", async function () {
    // Servidor efímero y base simulada: verifica el middleware real, no la base local.
    const app = express();
    app.use("/api/sesiones", exigirCoach, rutasCoaching);
    const servidor = app.listen(0, "127.0.0.1");
    await new Promise(function (resolve) { servidor.once("listening", resolve); });
    const url = `http://127.0.0.1:${servidor.address().port}/api/sesiones`;
    const sesion = crearSesion("MGR001");
    const sesionCoach = crearSesion("COACH001");
    const original = pool.execute;
    pool.execute = async function (sql, parametros) {
        if (sql.includes("CAST(sesion.sesion_id")) return [[]];
        return [[{ employeeId: parametros[0], rol: parametros[0] === "MGR001" ? "Manager" : "Coach" }]];
    };
    try {
        assert.equal((await fetch(url)).status, 401);
        assert.equal((await fetch(url, { headers: { cookie: `smart_coach_sesion=${sesion.token}` } })).status, 403);
        const permitida = await fetch(url, { headers: { cookie: `smart_coach_sesion=${sesionCoach.token}` } });
        assert.equal(permitida.status, 200);
        assert.deepEqual(await permitida.json(), { estado: "ok", total: 0, datos: [] });
    } finally {
        pool.execute = original;
        cerrarSesion(sesion.token);
        cerrarSesion(sesionCoach.token);
        await new Promise(function (resolve) { servidor.close(resolve); });
    }
});
