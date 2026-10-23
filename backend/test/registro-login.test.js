import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import { crearHashContrasena, verificarContrasena } from "../src/auth/password.js";
import { registrarCoach, iniciarSesion } from "../src/controllers/auth.controller.js";

function respuestaDePrueba() {
    return {
        codigo: 200,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; },
        cookie(nombre, valor, opciones) { this.cookieGuardada = { nombre, valor, opciones }; return this; }
    };
}

test("un Manager registra un Coach con rol fijo, supervisor y contraseña cifrada", async function () {
    const original = pool.execute;
    let parametrosGuardados;
    pool.execute = async function (sql, parametros) {
        assert.match(sql, /INSERT INTO usuarios/);
        assert.match(sql, /WHERE nombre = 'Coach'/);
        parametrosGuardados = parametros;
        return [{ affectedRows: 1 }];
    };
    const respuesta = respuestaDePrueba();
    try {
        await registrarCoach({
            usuario: { employeeId: "MGR001", rol: "Manager" },
            body: {
                employeeId: " coach009 ", nombre: " Ana Prueba ", correo: " ANA@EJEMPLO.COM ",
                contrasena: "contraseña de prueba segura", rol: "Manager", supervisorId: "DIR001"
            }
        }, respuesta);
    } finally {
        pool.execute = original;
    }
    assert.equal(respuesta.codigo, 201);
    assert.deepEqual(parametrosGuardados.slice(0, 3), ["COACH009", "Ana Prueba", "ana@ejemplo.com"]);
    assert.equal(parametrosGuardados[4], "MGR001");
    assert.equal(await verificarContrasena("contraseña de prueba segura", parametrosGuardados[3]), true);
    assert.equal(respuesta.cuerpo.datos.rol, "Coach");
    assert.equal(JSON.stringify(respuesta.cuerpo).includes("contraseña de prueba segura"), false);
});

test("registro rechaza datos inválidos y duplicados sin devolver secretos", async function () {
    const original = pool.execute;
    let consultas = 0;
    pool.execute = async function () {
        consultas += 1;
        throw Object.assign(new Error("duplicado"), { code: "ER_DUP_ENTRY" });
    };
    try {
        const invalida = respuestaDePrueba();
        await registrarCoach({ usuario: { employeeId: "MGR001" }, body: {
            employeeId: "!", nombre: "A", correo: "sin-correo", contrasena: "corta"
        } }, invalida);
        assert.equal(invalida.codigo, 400);
        assert.equal(consultas, 0);

        const duplicada = respuestaDePrueba();
        await registrarCoach({ usuario: { employeeId: "MGR001" }, body: {
            employeeId: "COACH009", nombre: "Ana Prueba", correo: "ana@ejemplo.com",
            contrasena: "contraseña de prueba segura"
        } }, duplicada);
        assert.equal(duplicada.codigo, 409);
        assert.equal(consultas, 1);
    } finally {
        pool.execute = original;
    }
});

test("inicio de sesión acepta la clave correcta y rechaza la incorrecta", async function () {
    const hash = await crearHashContrasena("contraseña de prueba segura");
    const original = pool.execute;
    pool.execute = async function () {
        return [[{ employeeId: "COACH009", nombre: "Ana Prueba", correo: "ana@ejemplo.com", rol: "Coach", passwordHash: hash }]];
    };
    try {
        const correcta = respuestaDePrueba();
        await iniciarSesion({ body: { correo: "ANA@EJEMPLO.COM", contrasena: "contraseña de prueba segura" }, ip: "test-registro-correcto", headers: {} }, correcta);
        assert.equal(correcta.codigo, 200);
        assert.equal(correcta.cuerpo.estado, "ok");
        assert.equal(correcta.cookieGuardada.opciones.httpOnly, true);

        const incorrecta = respuestaDePrueba();
        await iniciarSesion({ body: { correo: "ana@ejemplo.com", contrasena: "incorrecta" }, ip: "test-registro-incorrecto", headers: {} }, incorrecta);
        assert.equal(incorrecta.codigo, 401);
        assert.equal(incorrecta.cuerpo.estado, "error");
        assert.equal(incorrecta.cookieGuardada, undefined);
    } finally {
        pool.execute = original;
    }
});
