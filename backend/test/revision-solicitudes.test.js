import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { resolverSolicitudRevision } from "../src/controllers/revision-solicitudes.controller.js";

function respuestaDePrueba() {
    return {
        codigo: 200,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };
}

for (const decision of ["APROBADA", "RECHAZADA"]) {
    test(`el Manager puede marcar ${decision} sin borrar ni editar la sesión`, async function () {
        const consultas = [];
        let confirmada = false;
        let liberada = false;
        const conexion = {
            async beginTransaction() {},
            async execute(sql, parametros) {
                consultas.push({ sql, parametros });
                if (sql.startsWith("SELECT q.estado")) {
                    return [[{ estado: "PENDIENTE", estadoSesion: "COMPLETADA", tipoSesion: "COACHING" }]];
                }
                if (sql.startsWith("UPDATE solicitudes_eliminacion_sesion")) return [{ affectedRows: 1 }];
                throw new Error("Consulta inesperada en la prueba");
            },
            async commit() { confirmada = true; },
            async rollback() { throw new Error("No debe revertirse una revisión válida"); },
            release() { liberada = true; }
        };
        const original = pool.getConnection;
        pool.getConnection = async () => conexion;
        const solicitud = {
            params: { id: "8" },
            body: { decision, justificacion: "La decisión fue revisada junto con el motivo y la sesión." },
            usuario: { employeeId: "MGR001" }
        };
        const respuesta = respuestaDePrueba();
        try {
            await resolverSolicitudRevision(solicitud, respuesta);
        } finally {
            pool.getConnection = original;
        }
        assert.equal(respuesta.codigo, 200);
        assert.equal(respuesta.cuerpo.datos.estado, decision);
        assert.equal(confirmada, true);
        assert.equal(liberada, true);
        assert.deepEqual(consultas[0].parametros, [8, "MGR001"]);
        assert.deepEqual(consultas[1].parametros, [decision, "MGR001", solicitud.body.justificacion, 8]);
        assert.equal(consultas.some(({ sql }) => /^\s*DELETE\b|^\s*UPDATE sesiones\b/i.test(sql)), false);
    });
}

test("el Manager no resuelve solicitudes fuera de su equipo", async function () {
    let revertida = false;
    let liberada = false;
    const conexion = {
        async beginTransaction() {},
        async execute(sql, parametros) {
            assert.match(sql, /c\.supervisor_id = \?/);
            assert.deepEqual(parametros, [8, "MGR001"]);
            return [[]];
        },
        async commit() { throw new Error("No debe confirmar una solicitud ajena"); },
        async rollback() { revertida = true; },
        release() { liberada = true; }
    };
    const original = pool.getConnection;
    pool.getConnection = async () => conexion;
    const respuesta = respuestaDePrueba();
    try {
        await resolverSolicitudRevision({
            params: { id: "8" },
            body: { decision: "APROBADA", justificacion: "Esta solicitud no pertenece a mi equipo de trabajo." },
            usuario: { employeeId: "MGR001" }
        }, respuesta);
    } finally {
        pool.getConnection = original;
    }
    assert.equal(respuesta.codigo, 404);
    assert.equal(revertida, true);
    assert.equal(liberada, true);
});
