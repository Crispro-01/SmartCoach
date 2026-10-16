import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import {
    crearSesionCoaching,
    actualizarBorradorCoaching,
    descartarBorradorCoaching
} from "../src/controllers/coaching.controller.js";

function respuestaDePrueba() {
    return {
        codigo: 200,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };
}

function solicitudDePrueba() {
    const comportamientos = [1, 2];
    return {
        usuario: { employeeId: "COACH001" },
        body: {
            agentId: "TM001",
            opening: true,
            followUpTypeId: 1,
            sessionNumber: 1,
            behaviorWorkedId: 1,
            calls: [1, 2].map(function (numero) {
                return {
                    number: numero,
                    contactId: "CONTACT-" + numero,
                    callDriverId: numero + 2,
                    summary: "Resumen de prueba " + numero,
                    resolved: true,
                    evaluations: comportamientos.map(function (behaviorId) {
                        return { behaviorId, fulfilled: behaviorId === 1 };
                    })
                };
            }),
            kpi: { kpiId: 1, resultMtd: "10", currentResult: "12", nextGoal: "15" },
            commitments: {
                coach: { what: "Qué", how: "Cómo", when: "Cuándo", recognition: "Reconocimiento" },
                agent: { what: "Qué", how: "Cómo", when: "Cuándo", evaluation: "Evaluación", recognition: "Reconocimiento" }
            },
            rca: {
                activity: "Roleplay", closingBehavior: true, callsWithBehavior: "1 de 2",
                trendLast3Weeks: "Estable", reasonNotPerformed: "No aplica",
                activityToOvercome: "Práctica", whyContinue: "Mejora continua",
                roleplayResult: "Correcto", currentAttainment: "80%",
                kpiChange: "Mejora", behaviorChange: "Mantener"
            },
            durationSeconds: 900
        }
    };
}

function conexionDePrueba({ fallarEnRca = false, convertirBorrador = false } = {}) {
    const consultas = [];
    const estado = { iniciada: false, confirmada: false, revertida: false, liberada: false };
    let siguienteLlamadaId = 100;

    const conexion = {
        async beginTransaction() { estado.iniciada = true; },
        async execute(sql, parametros = []) {
            consultas.push({ sql, parametros });
            if (sql.startsWith("SELECT a.employee_id")) {
                return [[{ agenteId: "TM001", coachId: "COACH001" }]];
            }
            if (sql === "SELECT comportamiento_id FROM comportamientos WHERE activo = TRUE") {
                return [[{ comportamiento_id: 1 }, { comportamiento_id: 2 }]];
            }
            if (sql === "SELECT call_driver_id FROM call_drivers WHERE activo = TRUE") {
                return [[{ call_driver_id: 3 }, { call_driver_id: 4 }]];
            }
            if (sql === "SELECT kpi_id FROM kpis WHERE activo = TRUE") return [[{ kpi_id: 1 }]];
            if (sql === "SELECT tipo_seguimiento_id, nombre FROM tipos_seguimiento") {
                return [[{ tipo_seguimiento_id: 1, nombre: "Constructivo" }]];
            }
            if (sql === "SELECT tipo_sesion_id FROM tipos_sesion WHERE codigo = 'COACHING'") {
                return [[{ tipo_sesion_id: 1 }]];
            }
            if (sql === "SELECT estado_sesion_id FROM estados_sesion WHERE codigo = 'COMPLETADA'") {
                return [[{ estado_sesion_id: 3 }]];
            }
            if (convertirBorrador && sql.startsWith("SELECT s.sesion_id AS id")) {
                return [[{ id: 23, estado: "BORRADOR", contenido: "{}" }]];
            }
            if (sql.startsWith("INSERT INTO sesiones")) return [{ insertId: 77 }];
            if (sql.startsWith("UPDATE sesiones SET estado_sesion_id")) return [{ affectedRows: 1 }];
            if (sql.startsWith("INSERT INTO coaching_llamadas")) {
                siguienteLlamadaId += 1;
                return [{ insertId: siguienteLlamadaId }];
            }
            if (fallarEnRca && sql.startsWith("INSERT INTO coaching_rca")) {
                throw new Error("Fallo simulado al guardar RCA");
            }
            if (sql.startsWith("INSERT INTO coaching_")) return [{ affectedRows: 1 }];
            throw new Error("Consulta inesperada en la prueba: " + sql);
        },
        async commit() { estado.confirmada = true; },
        async rollback() { estado.revertida = true; },
        release() { estado.liberada = true; }
    };
    return { conexion, consultas, estado };
}

test("guardar Coaching persiste todos sus bloques en una transacción", async function () {
    const original = pool.getConnection;
    const prueba = conexionDePrueba();
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await crearSesionCoaching(solicitudDePrueba(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 201);
    assert.deepEqual(respuesta.cuerpo.datos, { sesionId: "77" });
    assert.equal(prueba.estado.iniciada, true);
    assert.equal(prueba.estado.confirmada, true);
    assert.equal(prueba.estado.revertida, false);
    assert.equal(prueba.estado.liberada, true);
    for (const tabla of [
        "sesiones", "coaching_detalles", "coaching_llamadas",
        "coaching_evaluaciones_llamada", "coaching_resultados_comportamiento",
        "coaching_kpis", "coaching_compromisos", "coaching_rca"
    ]) {
        assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("INSERT INTO " + tabla)), true, "faltó guardar " + tabla);
    }
});

async function ejecutarSesionConfigurada(configurar) {
    const original = pool.getConnection;
    const prueba = conexionDePrueba();
    const solicitud = solicitudDePrueba();
    configurar(solicitud.body);
    const respuesta = respuestaDePrueba();
    pool.getConnection = async function () { return prueba.conexion; };
    try {
        await crearSesionCoaching(solicitud, respuesta);
    } finally {
        pool.getConnection = original;
    }
    return { prueba, respuesta };
}

test("los límites numéricos se validan antes de escribir la sesión", async function () {
    const casos = [
        { nombre: "sesión cero", configurar: cuerpo => { cuerpo.sessionNumber = 0; }, mensaje: /número de sesión/ },
        { nombre: "sesión fraccionaria", configurar: cuerpo => { cuerpo.sessionNumber = 1.5; }, mensaje: /número de sesión/ },
        { nombre: "sesión fuera de rango", configurar: cuerpo => { cuerpo.sessionNumber = 65536; }, mensaje: /número de sesión/ },
        { nombre: "KPI no numérico", configurar: cuerpo => { cuerpo.kpi.resultMtd = "abc"; }, mensaje: /resultado MTD/ },
        { nombre: "KPI con cinco decimales", configurar: cuerpo => { cuerpo.kpi.resultMtd = "12.12345"; }, mensaje: /resultado MTD/ },
        { nombre: "KPI fuera de rango", configurar: cuerpo => { cuerpo.kpi.currentResult = "100000000"; }, mensaje: /resultado actual/ },
        {
            nombre: "meta anterior vacía en seguimiento",
            configurar: cuerpo => { cuerpo.opening = false; cuerpo.kpi.previousGoal = ""; },
            mensaje: /meta anterior/
        }
    ];
    for (const caso of casos) {
        const { prueba, respuesta } = await ejecutarSesionConfigurada(caso.configurar);
        assert.equal(respuesta.codigo, 400, caso.nombre);
        assert.match(respuesta.cuerpo.mensaje, caso.mensaje, caso.nombre);
        assert.equal(prueba.consultas.some(({ sql }) => /^(INSERT|UPDATE|DELETE) /.test(sql)), false, caso.nombre);
        assert.equal(prueba.estado.confirmada, false, caso.nombre);
        assert.equal(prueba.estado.revertida, true, caso.nombre);
        assert.equal(prueba.estado.liberada, true, caso.nombre);
    }
});

test("los textos vacíos o demasiado largos no generan registros parciales", async function () {
    const casos = [
        { nombre: "Contact ID con espacios", configurar: cuerpo => { cuerpo.calls[0].contactId = "   "; }, mensaje: /Contact ID/ },
        { nombre: "Contact ID de 81 caracteres", configurar: cuerpo => { cuerpo.calls[0].contactId = "A".repeat(81); }, mensaje: /Contact ID/ },
        { nombre: "resumen de 5001 caracteres", configurar: cuerpo => { cuerpo.calls[1].summary = "A".repeat(5001); }, mensaje: /resumen de llamada 2/ },
        { nombre: "compromiso ausente", configurar: cuerpo => { delete cuerpo.commitments.coach.what; }, mensaje: /compromiso del Coach: qué/ }
    ];
    for (const caso of casos) {
        const { prueba, respuesta } = await ejecutarSesionConfigurada(caso.configurar);
        assert.equal(respuesta.codigo, 400, caso.nombre);
        assert.match(respuesta.cuerpo.mensaje, caso.mensaje, caso.nombre);
        assert.equal(prueba.consultas.some(({ sql }) => /^(INSERT|UPDATE|DELETE) /.test(sql)), false, caso.nombre);
        assert.equal(prueba.estado.confirmada, false, caso.nombre);
        assert.equal(prueba.estado.revertida, true, caso.nombre);
        assert.equal(prueba.estado.liberada, true, caso.nombre);
    }
});

test("se aceptan los límites permitidos y los caracteres especiales se envían como parámetros", async function () {
    const resumen = "Atención a José O'Neil: <prueba> & \"comillas\"; 100%.";
    const { prueba, respuesta } = await ejecutarSesionConfigurada(function (cuerpo) {
        cuerpo.opening = false;
        cuerpo.sessionNumber = 65535;
        cuerpo.calls[0].contactId = "Á".repeat(80);
        cuerpo.calls[0].summary = resumen;
        cuerpo.kpi.resultMtd = "99999999.9999";
        cuerpo.kpi.previousGoal = "0";
        cuerpo.kpi.currentResult = "-99999999.9999";
        cuerpo.kpi.nextGoal = "0.0001";
    });

    assert.equal(respuesta.codigo, 201);
    assert.equal(prueba.estado.confirmada, true);
    assert.equal(prueba.estado.revertida, false);
    assert.equal(prueba.estado.liberada, true);
    const detalle = prueba.consultas.find(({ sql }) => sql.startsWith("INSERT INTO coaching_detalles"));
    assert.equal(detalle.parametros[3], 65535);
    const llamada = prueba.consultas.find(({ sql }) => sql.startsWith("INSERT INTO coaching_llamadas"));
    assert.equal(llamada.parametros[2], "Á".repeat(80));
    assert.equal(llamada.parametros[4], resumen);
    assert.equal(llamada.sql.includes(resumen), false);
    const kpi = prueba.consultas.find(({ sql }) => sql.startsWith("INSERT INTO coaching_kpis"));
    assert.deepEqual(kpi.parametros, [77, 1, 99999999.9999, 0, -99999999.9999, false, 0.0001]);
});

test("si falla un bloque del Coaching se revierte toda la transacción", async function () {
    const original = pool.getConnection;
    const prueba = conexionDePrueba({ fallarEnRca: true });
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await crearSesionCoaching(solicitudDePrueba(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 500);
    assert.equal(respuesta.cuerpo.estado, "error");
    assert.equal(prueba.estado.confirmada, false);
    assert.equal(prueba.estado.revertida, true);
    assert.equal(prueba.estado.liberada, true);
});

test("una sesión incompleta se rechaza antes de insertar datos", async function () {
    const original = pool.getConnection;
    const prueba = conexionDePrueba();
    pool.getConnection = async function () { return prueba.conexion; };
    const solicitud = solicitudDePrueba();
    solicitud.body.calls[0].evaluations.pop();
    const respuesta = respuestaDePrueba();

    try {
        await crearSesionCoaching(solicitud, respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 400);
    assert.match(respuesta.cuerpo.mensaje, /Completa los comportamientos/);
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("INSERT INTO ")), false);
    assert.equal(prueba.estado.confirmada, false);
    assert.equal(prueba.estado.revertida, true);
    assert.equal(prueba.estado.liberada, true);
});

test("completar un borrador conserva su ID y guarda sus detalles en la misma transacción", async function () {
    const original = pool.getConnection;
    const prueba = conexionDePrueba({ convertirBorrador: true });
    pool.getConnection = async function () { return prueba.conexion; };
    const solicitud = solicitudDePrueba();
    solicitud.body.draftId = "23";
    const respuesta = respuestaDePrueba();

    try {
        await crearSesionCoaching(solicitud, respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 201);
    assert.deepEqual(respuesta.cuerpo.datos, { sesionId: "23" });
    const actualizacion = prueba.consultas.find(({ sql }) => sql.startsWith("UPDATE sesiones SET estado_sesion_id"));
    assert.ok(actualizacion);
    assert.equal(actualizacion.parametros.at(-1), 23);
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("INSERT INTO sesiones")), false);
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("INSERT INTO coaching_rca")), true);
    assert.equal(prueba.estado.confirmada, true);
    assert.equal(prueba.estado.revertida, false);
    assert.equal(prueba.estado.liberada, true);
});

function conexionParaEditarBorrador(estadoBorrador) {
    const consultas = [];
    const estado = { iniciada: false, confirmada: false, revertida: false, liberada: false };
    const conexion = {
        async beginTransaction() { estado.iniciada = true; },
        async execute(sql, parametros = []) {
            consultas.push({ sql, parametros });
            if (sql.startsWith("SELECT a.employee_id")) {
                return [[{ agenteId: "TM001", coachId: "COACH001" }]];
            }
            if (sql.startsWith("SELECT s.sesion_id AS id")) {
                return [[{ id: 23, estado: estadoBorrador, contenido: "{}" }]];
            }
            if (sql.startsWith("UPDATE sesiones SET borrador_json")) return [{ affectedRows: 1 }];
            if (sql.startsWith("DELETE FROM sesiones")) return [{ affectedRows: 1 }];
            throw new Error("Consulta inesperada en la prueba: " + sql);
        },
        async commit() { estado.confirmada = true; },
        async rollback() { estado.revertida = true; },
        release() { estado.liberada = true; }
    };
    return { conexion, consultas, estado };
}

function solicitudParaEditarBorrador() {
    return {
        params: { id: "23" },
        body: { agentId: "TM001", tema: "Seguimiento actualizado" },
        usuario: { employeeId: "COACH001" }
    };
}

test("el Coach puede actualizar el contenido de un borrador propio", async function () {
    const original = pool.getConnection;
    const prueba = conexionParaEditarBorrador("BORRADOR");
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await actualizarBorradorCoaching(solicitudParaEditarBorrador(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 200);
    assert.deepEqual(respuesta.cuerpo.datos, { sesionId: "23" });
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("UPDATE sesiones SET borrador_json")), true);
    assert.equal(prueba.estado.confirmada, true);
    assert.equal(prueba.estado.revertida, false);
    assert.equal(prueba.estado.liberada, true);
});

test("una sesión completada no se puede editar como borrador", async function () {
    const original = pool.getConnection;
    const prueba = conexionParaEditarBorrador("COMPLETADA");
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await actualizarBorradorCoaching(solicitudParaEditarBorrador(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 409);
    assert.match(respuesta.cuerpo.mensaje, /ya no es un borrador/);
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("UPDATE sesiones SET borrador_json")), false);
    assert.equal(prueba.estado.confirmada, false);
    assert.equal(prueba.estado.revertida, true);
    assert.equal(prueba.estado.liberada, true);
});

test("el Coach puede descartar su borrador incompleto", async function () {
    const original = pool.getConnection;
    const prueba = conexionParaEditarBorrador("BORRADOR");
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await descartarBorradorCoaching(solicitudParaEditarBorrador(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 200);
    assert.deepEqual(respuesta.cuerpo.datos, { sesionId: "23" });
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("DELETE FROM sesiones")), true);
    assert.equal(prueba.estado.confirmada, true);
    assert.equal(prueba.estado.revertida, false);
    assert.equal(prueba.estado.liberada, true);
});

test("una sesión completada no se puede descartar como borrador", async function () {
    const original = pool.getConnection;
    const prueba = conexionParaEditarBorrador("COMPLETADA");
    pool.getConnection = async function () { return prueba.conexion; };
    const respuesta = respuestaDePrueba();

    try {
        await descartarBorradorCoaching(solicitudParaEditarBorrador(), respuesta);
    } finally {
        pool.getConnection = original;
    }

    assert.equal(respuesta.codigo, 409);
    assert.match(respuesta.cuerpo.mensaje, /ya no es un borrador/);
    assert.equal(prueba.consultas.some(({ sql }) => sql.startsWith("DELETE FROM sesiones")), false);
    assert.equal(prueba.estado.confirmada, false);
    assert.equal(prueba.estado.revertida, true);
    assert.equal(prueba.estado.liberada, true);
});
