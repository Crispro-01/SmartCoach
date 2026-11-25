import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { crearBorradorCorrectiva, obtenerBorradorCorrectiva, actualizarBorradorCorrectiva,
    descartarBorradorCorrectiva, completarCorrectiva, consultarCorrectiva,
    solicitarEliminacionCorrectiva } from "../src/controllers/correctivas.controller.js";
import { resolverSolicitudRevision } from "../src/controllers/revision-solicitudes.controller.js";

const cuerpoValido = () => ({ agentId: "TM001", cause: "PRUEBA: situación descrita por el representante.",
    agentCommitment: "PRUEBA: compromiso concreto del representante.", coachCommitment: "PRUEBA: acompañamiento del Coach." });

async function ejecutar(controlador, { tipo = "accountability", body = cuerpoValido(), estado = "BORRADOR",
    ajeno = false, tipoReal, falloDetalle = false, revision = false, decision, fallarConexion = false } = {}) {
    const codigo = tipo === "accountability" ? "ACCOUNTABILITY" : "VERBAL_WARNING";
    const consultas = [], eventos = [];
    const conexion = {
        async beginTransaction() { eventos.push("begin"); },
        async commit() { eventos.push("commit"); },
        async rollback() { eventos.push("rollback"); },
        release() { eventos.push("release"); },
        async execute(sql, params) {
            consultas.push({ sql, params });
            if (sql.startsWith("SELECT a.employee_id")) return [ajeno ? [] : [{ employee_id: "TM001" }]];
            if (sql.startsWith("SELECT s.sesion_id AS id, s.borrador_json")) return [(tipoReal && params[3] !== tipoReal) ? [] : [{ id: 23, estado, contenido: JSON.stringify(body) }]];
            if (sql.startsWith("SELECT t.tipo_sesion_id")) return [[{ tipo_sesion_id: 2, estado_sesion_id: 3 }]];
            if (sql.startsWith("INSERT INTO sesiones_correctivas")) {
                if (falloDetalle) throw new Error("Fallo simulado al escribir el detalle correctivo");
                return [{ affectedRows: 1 }];
            }
            if (sql.startsWith("INSERT INTO sesiones ")) return [{ insertId: 77 }];
            if (/^(UPDATE sesiones|DELETE FROM sesiones)/.test(sql)) return [{ affectedRows: 1 }];
            if (sql.startsWith("SELECT s.sesion_id AS id, s.agente_id")) return [ajeno || (tipoReal && params[3] !== tipoReal) ? [] : [{ id: 23, tipo: codigo }]];
            if (sql.startsWith("SELECT estado, motivo")) return [[]];
            if (sql.startsWith("SELECT e.codigo AS estado")) return [[{ estado: "COMPLETADA" }]];
            if (sql.startsWith("SELECT estado FROM solicitudes")) return [[]];
            if (sql.startsWith("INSERT INTO solicitudes")) return [{ insertId: 5 }];
            if (sql.startsWith("SELECT q.estado")) return [[{ estado: "PENDIENTE", estadoSesion: "COMPLETADA", tipoSesion: codigo }]];
            if (sql.startsWith("UPDATE solicitudes")) return [{ affectedRows: 1 }];
            throw new Error("Consulta inesperada: " + sql);
        }
    };
    const respuesta = { codigo: 200, status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; } };
    const original = pool.getConnection;
    pool.getConnection = async () => { eventos.push("conexion"); if (fallarConexion) throw new Error("Credenciales SQL privadas de prueba"); return conexion; };
    try {
        await controlador({ body: decision ? { decision, justificacion: "PRUEBA: revisión con justificación registrada por el Manager." } : body,
            params: { id: "23", tipo }, query: { agenteId: "TM001" },
            usuario: { employeeId: revision || decision ? "MGR001" : "COACH001", rol: revision || decision ? "Manager" : "Coach" } }, respuesta);
    } finally { pool.getConnection = original; }
    return { respuesta, consultas, eventos };
}

for (const tipo of ["accountability", "verbal-warning"]) {
    const codigo = tipo === "accountability" ? "ACCOUNTABILITY" : "VERBAL_WARNING";
    test(`${tipo}: guardar y recuperar campos parciales del equipo`, async () => {
        const r = await ejecutar(crearBorradorCorrectiva, { tipo, body: { agentId: "TM001", cause: "" } });
        assert.equal(r.respuesta.codigo, 201);
        assert.deepEqual(r.consultas.find(q => q.sql.startsWith("SELECT t.tipo_sesion_id")).params, [codigo, "BORRADOR"]);
        const leida = await ejecutar(obtenerBorradorCorrectiva, { tipo });
        assert.equal(leida.respuesta.cuerpo.datos.contenido.cause, cuerpoValido().cause);
    });
    test(`${tipo}: actualizar y descartar incompleta bloquean la misma sesión`, async () => {
        const r = await ejecutar(actualizarBorradorCorrectiva, { tipo });
        assert.equal(r.respuesta.cuerpo.datos.sesionId, "23");
        assert.ok(r.consultas.some(q => q.sql.endsWith("FOR UPDATE") && q.params[3] === codigo));
        assert.ok(r.eventos.includes("commit"));
        const d = await ejecutar(descartarBorradorCorrectiva, { tipo });
        assert.deepEqual(d.consultas.find(q => q.sql.startsWith("DELETE")).params, [23]);
    });
    test(`${tipo}: completar conserva ID, limpia borrador y persiste los tres campos`, async () => {
        const body = { ...cuerpoValido(), draftId: 23, tipo: "COACHING" };
        const r = await ejecutar(completarCorrectiva, { tipo, body });
        assert.equal(r.respuesta.codigo, 201);
        assert.equal(r.respuesta.cuerpo.datos.sesionId, "23");
        assert.deepEqual(r.consultas.find(q => q.sql.startsWith("INSERT INTO sesiones_correctivas")).params,
            [23, body.cause, body.agentCommitment, body.coachCommitment]);
        assert.ok(r.consultas.some(q => q.sql.includes("borrador_json = NULL")));
        assert.ok(!r.consultas.some(q => q.sql.startsWith("INSERT INTO sesiones ")));
    });
    test(`${tipo}: completada rechaza editar, completar de nuevo y descartar`, async () => {
        for (const controlador of [actualizarBorradorCorrectiva, descartarBorradorCorrectiva, completarCorrectiva]) {
            const r = await ejecutar(controlador, { tipo, estado: "COMPLETADA", body: { ...cuerpoValido(), draftId: 23 } });
            assert.equal(r.respuesta.codigo, 409);
            assert.ok(r.eventos.includes("rollback"));
            assert.ok(!r.consultas.some(q => /^(DELETE|UPDATE|INSERT)/.test(q.sql)));
        }
    });
    test(`${tipo}: solo el equipo asignado puede gestionar la sesión`, async () => {
        for (const controlador of [crearBorradorCorrectiva, obtenerBorradorCorrectiva, actualizarBorradorCorrectiva, descartarBorradorCorrectiva, completarCorrectiva, consultarCorrectiva]) {
            const r = await ejecutar(controlador, { tipo, ajeno: true });
            assert.equal(r.respuesta.codigo, 404);
            assert.ok(!r.consultas.some(q => /^(DELETE|UPDATE|INSERT)/.test(q.sql)));
        }
    });
    test(`${tipo}: un fallo en detalle revierte todas las escrituras`, async () => {
        const r = await ejecutar(completarCorrectiva, { tipo, falloDetalle: true });
        assert.equal(r.respuesta.codigo, 500);
        assert.ok(!r.eventos.includes("commit"));
        assert.deepEqual(r.eventos.slice(-2), ["rollback", "release"]);
    });
    test(`${tipo}: solicitudes y decisión del Manager conservan el contenido`, async () => {
        const r = await ejecutar(solicitarEliminacionCorrectiva, { tipo, body: { motivo: "PRUEBA: solicitud de archivo de una sesión ficticia." } });
        assert.equal(r.respuesta.codigo, 201);
        assert.deepEqual(r.consultas[0].params, [23, "COACH001", codigo]);
        for (const decision of ["APROBADA", "RECHAZADA"]) {
            const m = await ejecutar(resolverSolicitudRevision, { tipo, decision });
            assert.equal(m.respuesta.codigo, 200);
            assert.ok(!m.consultas.some(q => /^(DELETE|UPDATE sesiones\b)/.test(q.sql)));
        }
    });
    test(`${tipo}: consulta restringe tipo y ocultación; Manager conserva acceso al archivo`, async () => {
        const r = await ejecutar(consultarCorrectiva, { tipo });
        assert.equal(r.consultas[0].params[3], codigo);
        assert.match(r.consultas[0].sql, /NOT EXISTS/);
        const m = await ejecutar(consultarCorrectiva, { tipo, revision: true });
        assert.match(m.consultas[0].sql, /c.supervisor_id = \?/);
        assert.doesNotMatch(m.consultas[0].sql, /NOT EXISTS/);
    });
}
test("las rutas correctivas no permiten cruzar Accountability con Verbal Warning", async () => {
    for (const controlador of [obtenerBorradorCorrectiva, actualizarBorradorCorrectiva, descartarBorradorCorrectiva, completarCorrectiva, consultarCorrectiva]) {
        const r = await ejecutar(controlador, { tipo: "verbal-warning", tipoReal: "ACCOUNTABILITY", body: { ...cuerpoValido(), draftId: 23 } });
        assert.equal(r.respuesta.codigo, 404);
        assert.ok(!r.consultas.some(q => /^(DELETE|UPDATE|INSERT)/.test(q.sql)));
    }
});
test("tipo desconocido y payload inválido se rechazan antes de abrir MySQL", async () => {
    for (const tipo of ["coaching", "__proto__", "constructor", "ACCOUNTABILITY"]) {
        const r = await ejecutar(crearBorradorCorrectiva, { tipo });
        assert.equal(r.respuesta.codigo, 400); assert.equal(r.eventos.length, 0);
    }
    for (const body of [null, [], { agentId: "TM001", cause: " " }, { ...cuerpoValido(), coachCommitment: "x".repeat(1501) }]) {
        const r = await ejecutar(completarCorrectiva, { body });
        assert.equal(r.respuesta.codigo, 400); assert.equal(r.eventos.length, 0);
    }
});
test("los textos con caracteres SQL se envían como parámetros", async () => {
    const body = { ...cuerpoValido(), cause: "PRUEBA: '); DROP TABLE sesiones; -- <script>" };
    const r = await ejecutar(completarCorrectiva, { body });
    assert.equal(r.respuesta.codigo, 201);
    assert.equal(r.consultas.find(q => q.sql.startsWith("INSERT INTO sesiones_correctivas")).params[1], body.cause);
    assert.ok(r.consultas.every(q => !q.sql.includes(body.cause)));
});
test("los errores de conexión no exponen la configuración privada", async () => {
    const r = await ejecutar(crearBorradorCorrectiva, { fallarConexion: true });
    assert.equal(r.respuesta.codigo, 500); assert.doesNotMatch(r.respuesta.cuerpo.mensaje, /Credenciales|SQL/);
});
