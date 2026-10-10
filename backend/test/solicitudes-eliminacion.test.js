import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { solicitarEliminacionCoaching } from "../src/controllers/solicitudes-eliminacion.controller.js";

test("registrar una solicitud conserva la sesión y deja el motivo pendiente", async function () {
    const consultas = [];
    let confirmada = false;
    let liberada = false;
    const conexion = {
        async beginTransaction() {},
        async execute(sql, parametros) {
            consultas.push({ sql, parametros });
            if (sql.startsWith("SELECT e.codigo")) return [[{ estado: "COMPLETADA" }]];
            if (sql.startsWith("SELECT estado FROM solicitudes")) return [[]];
            if (sql.startsWith("INSERT INTO solicitudes")) return [{ insertId: 42 }];
            throw new Error("Consulta inesperada en la prueba");
        },
        async commit() { confirmada = true; },
        async rollback() { throw new Error("No debe revertirse una solicitud válida"); },
        release() { liberada = true; }
    };
    const original = pool.getConnection;
    pool.getConnection = async () => conexion;
    const motivo = "Se registró un dato incorrecto y necesito que se revise la sesión.";
    const solicitud = { params: { id: "3" }, body: { motivo }, usuario: { employeeId: "COACH001" } };
    const respuesta = {
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };

    try {
        await solicitarEliminacionCoaching(solicitud, respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 201);
    assert.deepEqual(respuesta.cuerpo.datos, { solicitudId: "42", estado: "PENDIENTE" });
    assert.equal(confirmada, true);
    assert.equal(liberada, true);
    assert.equal(consultas.length, 3);
    assert.deepEqual(consultas[2].parametros, [3, "COACH001", motivo]);
    assert.equal(consultas.some(({ sql }) => /^\s*(DELETE|UPDATE)\b/i.test(sql)), false);
});
