import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { crearBorradorItgf, obtenerBorradorItgf, actualizarBorradorItgf,
    descartarBorradorItgf, completarItgf, consultarItgf } from "../src/controllers/itgf.controller.js";
import { solicitarEliminacionCoaching } from "../src/controllers/solicitudes-eliminacion.controller.js";
import { resolverSolicitudRevision } from "../src/controllers/revision-solicitudes.controller.js";

const cuerpoValido = () => ({ agentId: "TM001", contactId: "ITGF-PRUEBA", callDriverId: 1, behaviorId: 1,
    fulfilled: false, observations: "Necesita reforzar el saludo", commitmentWhat: "Practicar saludo",
    commitmentHow: "Con roleplay", commitmentWhen: "Mañana" });

async function ejecutar(controlador, { body = cuerpoValido(), estado = "BORRADOR", ajeno = false,
    falloDetalle = false, catalogoInvalido = false, revision = false, resolver = false, tipo } = {}) {
    const consultas = [], eventos = [];
    const conexion = {
        async beginTransaction() { eventos.push("begin"); },
        async commit() { eventos.push("commit"); },
        async rollback() { eventos.push("rollback"); },
        release() { eventos.push("release"); },
        async execute(sql, params) {
            consultas.push({ sql, params });
            if (sql.startsWith("SELECT a.employee_id")) return [ajeno ? [] : [{ employee_id: "TM001" }]];
            if (sql.startsWith("SELECT s.sesion_id AS id, s.borrador_json")) return [[{ id: 23, estado, contenido: JSON.stringify(body) }]];
            if (sql.startsWith("SELECT t.tipo_sesion_id")) return [[{ tipo_sesion_id: 4, estado_sesion_id: 3 }]];
            if (sql.startsWith("SELECT d.call_driver_id") || sql.startsWith("SELECT comportamiento_id")) return [catalogoInvalido ? [] : [{ id: 1 }]];
            if (sql.startsWith("INSERT INTO sesiones_itgf")) {
                if (falloDetalle) throw new Error("Fallo simulado en el detalle ITGF");
                return [{ affectedRows: 1 }];
            }
            if (sql.startsWith("INSERT INTO sesiones ")) return [{ insertId: 77 }];
            if (/^(UPDATE sesiones|DELETE FROM sesiones)/.test(sql)) return [{ affectedRows: 1 }];
            if (sql.startsWith("SELECT s.sesion_id AS id, s.agente_id")) return [ajeno ? [] : [{ id: 23, cumplio: 0 }]];
            if (sql.startsWith("SELECT estado, motivo")) return [[]];
            if (sql.startsWith("SELECT e.codigo AS estado")) return [[{ estado: "COMPLETADA" }]];
            if (sql.startsWith("SELECT estado FROM solicitudes")) return [[]];
            if (sql.startsWith("INSERT INTO solicitudes")) return [{ insertId: 5 }];
            if (sql.startsWith("SELECT q.estado")) return [[{ estado: "PENDIENTE", estadoSesion: "COMPLETADA", tipoSesion: "ITGF" }]];
            if (sql.startsWith("UPDATE solicitudes")) return [{ affectedRows: 1 }];
            throw new Error("Consulta inesperada: " + sql);
        }
    };
    const respuesta = { codigo: 200, status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; } };
    const original = pool.getConnection;
    pool.getConnection = async () => conexion;
    try {
        await controlador({ body, params: { id: "23" }, query: { agenteId: "TM001" },
            usuario: { employeeId: revision || resolver ? "MGR001" : "COACH001", rol: revision || resolver ? "Manager" : "Coach" } }, respuesta, tipo);
    } finally { pool.getConnection = original; }
    return { respuesta, consultas, eventos };
}

test("ITGF admite guardar y recuperar contenido incompleto", async () => {
    const guardada = await ejecutar(crearBorradorItgf, { body: { agentId: "TM001", observations: "" } });
    assert.equal(guardada.respuesta.codigo, 201);
    assert.ok(guardada.consultas.some(q => q.sql.startsWith("INSERT INTO sesiones ")));
    const leida = await ejecutar(obtenerBorradorItgf, { body: { agentId: "TM001", fulfilled: false } });
    assert.equal(leida.respuesta.cuerpo.datos.contenido.fulfilled, false);
});
test("actualizar ITGF bloquea el borrador y conserva la misma sesión", async () => {
    const r = await ejecutar(actualizarBorradorItgf);
    assert.equal(r.respuesta.cuerpo.datos.sesionId, "23");
    assert.ok(r.consultas.some(q => q.sql.endsWith("FOR UPDATE")));
    assert.deepEqual(r.eventos, ["begin", "commit", "release"]);
});
test("descartar ITGF elimina únicamente el borrador autorizado", async () => {
    const r = await ejecutar(descartarBorradorItgf);
    assert.equal(r.respuesta.codigo, 200);
    assert.deepEqual(r.consultas.find(q => q.sql.startsWith("DELETE")).params, [23]);
});
test("ITGF completada rechaza edición y descarte", async () => {
    for (const controlador of [actualizarBorradorItgf, descartarBorradorItgf]) {
        const r = await ejecutar(controlador, { estado: "COMPLETADA" });
        assert.equal(r.respuesta.codigo, 409);
        assert.ok(r.eventos.includes("rollback"));
        assert.ok(!r.consultas.some(q => /^(DELETE|UPDATE)/.test(q.sql)));
    }
});
test("un Coach no guarda ni completa ITGF de otro equipo", async () => {
    for (const controlador of [crearBorradorItgf, obtenerBorradorItgf, actualizarBorradorItgf, descartarBorradorItgf, completarItgf]) {
        const r = await ejecutar(controlador, { ajeno: true });
        assert.equal(r.respuesta.codigo, 404);
        assert.ok(!r.consultas.some(q => /^(INSERT|UPDATE|DELETE)/.test(q.sql)));
    }
});
test("completar ITGF conserva el ID del borrador y guarda No como false", async () => {
    const r = await ejecutar(completarItgf, { body: { ...cuerpoValido(), draftId: 23 } });
    assert.equal(r.respuesta.codigo, 201);
    assert.equal(r.respuesta.cuerpo.datos.sesionId, "23");
    assert.equal(r.consultas.find(q => q.sql.startsWith("INSERT INTO sesiones_itgf")).params[4], false);
    assert.ok(!r.consultas.some(q => q.sql.startsWith("INSERT INTO sesiones ")));
    assert.ok(r.consultas.some(q => q.sql.includes("borrador_json = NULL")));
});
test("guardar incompleta ignora un draftId añadido al cuerpo y no completa la sesión", async () => {
    const r = await ejecutar(crearBorradorItgf, { body: { agentId: "TM001", draftId: 23 } });
    assert.equal(r.respuesta.codigo, 201);
    assert.ok(!r.consultas.some(q => q.sql.startsWith("UPDATE sesiones")));
    assert.ok(r.consultas.find(q => q.sql.startsWith("SELECT t.tipo_sesion_id")).params.includes("BORRADOR"));
});
test("ITGF valida campos completos, booleanos y catálogos activos", async () => {
    for (const body of [{ ...cuerpoValido(), observations: " " }, { ...cuerpoValido(), fulfilled: "false" },
        { ...cuerpoValido(), contactId: "x".repeat(81) }, { ...cuerpoValido(), callDriverId: -1 },
        { ...cuerpoValido(), behaviorId: true }]) {
        assert.equal((await ejecutar(completarItgf, { body })).respuesta.codigo, 400);
    }
    const r = await ejecutar(completarItgf, { catalogoInvalido: true });
    assert.equal(r.respuesta.codigo, 400);
    assert.ok(!r.consultas.some(q => /^(INSERT|UPDATE)/.test(q.sql)));
});
test("un fallo en el detalle ITGF revierte la sesión entera", async () => {
    const r = await ejecutar(completarItgf, { falloDetalle: true });
    assert.equal(r.respuesta.codigo, 500);
    assert.deepEqual(r.eventos, ["begin", "rollback", "release"]);
    assert.ok(!r.respuesta.cuerpo.mensaje.includes("simulado"));
});
test("consulta ITGF oculta aprobadas al Coach y permite trazabilidad al Manager", async () => {
    const coach = await ejecutar(consultarItgf);
    assert.equal(coach.respuesta.cuerpo.datos.cumplio, false);
    assert.match(coach.consultas[0].sql, /NOT EXISTS/);
    const manager = await ejecutar(consultarItgf, { revision: true });
    assert.match(manager.consultas[0].sql, /c.supervisor_id = \?/);
    assert.doesNotMatch(manager.consultas[0].sql, /NOT EXISTS/);
    assert.equal((await ejecutar(consultarItgf, { ajeno: true })).respuesta.codigo, 404);
});
test("solicitud y aprobación de ITGF conservan los datos y el motivo", async () => {
    const r = await ejecutar(solicitarEliminacionCoaching, { tipo: "ITGF", body: { motivo: "Sesión de prueba creada para validar el nuevo módulo." } });
    assert.equal(r.respuesta.codigo, 201);
    assert.deepEqual(r.consultas[0].params, [23, "COACH001", "ITGF"]);
    for (const decision of ["APROBADA", "RECHAZADA"]) {
        const m = await ejecutar(resolverSolicitudRevision, { resolver: true,
            body: { decision, justificacion: "Revisada la sesión y el motivo de la solicitud de prueba." } });
        assert.equal(m.respuesta.codigo, 200);
        assert.ok(m.eventos.includes("commit"));
        assert.ok(!m.consultas.some(q => /^(DELETE|UPDATE sesiones\b)/.test(q.sql)));
    }
});
