import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { listarAgentes } from "../src/controllers/agentes.controller.js";
import { consultarSesionCoaching } from "../src/controllers/consulta-coaching.controller.js";

function respuestaDePrueba() {
    return {
        codigo: 200,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };
}

test("el historial normal excluye sesiones con solicitud aprobada", async function () {
    let consulta;
    const original = pool.execute;
    pool.execute = async function (sql, parametros) {
        consulta = { sql, parametros };
        return [[]];
    };
    const respuesta = respuestaDePrueba();
    try {
        await listarAgentes({ usuario: { employeeId: "COACH001" } }, respuesta);
    } finally {
        pool.execute = original;
    }
    assert.equal(respuesta.codigo, 200);
    assert.match(consulta.sql, /NOT EXISTS[\s\S]*archivo\.estado = 'APROBADA'/);
    assert.deepEqual(consulta.parametros, ["Agente", "COACH001"]);
});

for (const rol of ["Coach", "Manager"]) {
    test(`el detalle usa el permiso correcto para ${rol}`, async function () {
        let consulta;
        const original = pool.getConnection;
        pool.getConnection = async function () {
            return {
                async execute(sql, parametros) {
                    consulta = { sql, parametros };
                    return [[]];
                },
                release() {}
            };
        };
        const respuesta = respuestaDePrueba();
        try {
            await consultarSesionCoaching({
                params: { id: "3" },
                query: { agenteId: "TM001" },
                usuario: { employeeId: rol === "Coach" ? "COACH001" : "MGR001", rol }
            }, respuesta);
        } finally {
            pool.getConnection = original;
        }
        assert.equal(respuesta.codigo, 404);
        if (rol === "Manager") {
            assert.match(consulta.sql, /c\.supervisor_id = \?/);
            assert.doesNotMatch(consulta.sql, /q\.estado = 'APROBADA'/);
        } else {
            assert.match(consulta.sql, /s\.coach_id = \?/);
            assert.match(consulta.sql, /NOT EXISTS[\s\S]*q\.estado = 'APROBADA'/);
        }
    });
}
