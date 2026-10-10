import test from "node:test";
import assert from "node:assert/strict";
import { crearHashContrasena, verificarContrasena, validarContrasena } from "../src/auth/password.js";
import { crearSesion, buscarSesion, cerrarSesion } from "../src/auth/sessions.js";

test("las contraseñas se guardan como hashes salados y no como texto", async function () {
    const contrasena = "frase de prueba para Smart Coach";
    const primero = await crearHashContrasena(contrasena);
    const segundo = await crearHashContrasena(contrasena);
    assert.notEqual(primero, segundo);
    assert.equal(primero.includes(contrasena), false);
    assert.equal(await verificarContrasena(contrasena, primero), true);
    assert.equal(await verificarContrasena("otra contraseña", primero), false);
    assert.equal(await verificarContrasena(contrasena, "formato-invalido"), false);
});

test("no se aceptan contraseñas demasiado cortas", function () {
    assert.throws(function () { validarContrasena("corta"); });
});

test("cerrar sesión invalida el token emitido", function () {
    const sesion = crearSesion("COACH001");
    assert.equal(buscarSesion(sesion.token)?.employeeId, "COACH001");
    cerrarSesion(sesion.token);
    assert.equal(buscarSesion(sesion.token), null);
});
