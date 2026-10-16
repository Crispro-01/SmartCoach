import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function prepararResumen(equipo, historial) {
    const nodos = Object.fromEntries([
        "totalAgentes", "totalSesiones", "totalIncompletas", "mensajeResumen", "reintentarResumen"
    ].map(function (id) { return [id, { textContent: "", hidden: false }]; }));
    const contexto = vm.createContext({
        document: { getElementById(id) { return nodos[id]; }, addEventListener() {} },
        window: { location: { href: "" } },
        console: { error() {} },
        async fetch(url) {
            const respuesta = url === "/api/agentes" ? equipo : historial;
            if (respuesta instanceof Error) throw respuesta;
            return respuesta;
        }
    });
    vm.runInContext(fs.readFileSync(new URL("../../Frontend/dashboard.js", import.meta.url), "utf8"), contexto);
    return { contexto, nodos };
}

function datos(datos) {
    return { status: 200, ok: true, async json() { return { datos }; } };
}

test("Inicio cuenta agentes y sesiones visibles; solo Borrador suma como incompleta", async function () {
    const { contexto, nodos } = prepararResumen(datos([{}, {}, {}, {}, {}]), datos([
        { estado: "Completada" }, { estado: "Borrador" }, { estado: "Completada" }
    ]));
    await vm.runInContext("cargarResumenCoach()", contexto);
    assert.equal(nodos.totalAgentes.textContent, "5");
    assert.equal(nodos.totalSesiones.textContent, "3");
    assert.equal(nodos.totalIncompletas.textContent, "1");
    assert.equal(nodos.reintentarResumen.hidden, true);
});

test("Inicio muestra ceros cuando ambas consultas terminan sin registros", async function () {
    const { contexto, nodos } = prepararResumen(datos([]), datos([]));
    await vm.runInContext("cargarResumenCoach()", contexto);
    for (const id of ["totalAgentes", "totalSesiones", "totalIncompletas"]) {
        assert.equal(nodos[id].textContent, "0");
    }
});

test("Inicio no muestra totales parciales ni ceros falsos ante fallos", async function () {
    for (const fallo of [new Error("Sin conexión"), { status: 500, ok: false }, datos(null)]) {
        const { contexto, nodos } = prepararResumen(datos([{}]), fallo);
        await vm.runInContext("cargarResumenCoach()", contexto);
        for (const id of ["totalAgentes", "totalSesiones", "totalIncompletas"]) {
            assert.equal(nodos[id].textContent, "—");
        }
        assert.equal(nodos.reintentarResumen.hidden, false);
        assert.match(nodos.mensajeResumen.textContent, /No se pudo cargar/);
    }
});

test("Inicio redirige al login si vence la sesión y no revela contadores sin permiso", async function () {
    const vencida = prepararResumen(datos([]), { status: 401, ok: false });
    await vm.runInContext("cargarResumenCoach()", vencida.contexto);
    assert.equal(vencida.contexto.window.location.href, "index.html");
    const prohibida = prepararResumen(datos([]), { status: 403, ok: false });
    await vm.runInContext("cargarResumenCoach()", prohibida.contexto);
    assert.equal(prohibida.nodos.totalSesiones.textContent, "—");
    assert.match(prohibida.nodos.mensajeResumen.textContent, /No tienes permiso/);
});
