import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import {
    crearSesionCoaching,
    actualizarBorradorCoaching
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

function conexionDePrueba({ fallarEnRca = false } = {}) {
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
            if (sql.startsWith("INSERT INTO sesiones")) return [{ insertId: 77 }];
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
