import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function prepararSeguimiento(respuestas) {
    const nodos = new Map();
    function nodo() {
        return {
            textContent: "",
            hidden: false,
            dataset: {},
            hijos: [],
            append(...hijos) { this.hijos.push(...hijos); },
            replaceChildren() { this.hijos = []; },
            addEventListener() {}
        };
    }
    const documento = {
        getElementById(id) {
            if (!nodos.has(id)) nodos.set(id, nodo());
            return nodos.get(id);
        },
        createElement() { return nodo(); },
        addEventListener() {}
    };
    const contexto = vm.createContext({
        document: documento,
        window: { location: { href: "" } },
        console: { error() {} },
        fetch(url) { return respuestas[url]; },
        encodeURIComponent
    });
    vm.runInContext(fs.readFileSync(new URL("../../Frontend/seguimiento.js", import.meta.url), "utf8"), contexto);
    return { contexto, nodos, documento };
}

function respuesta(datos) {
    return { status: 200, ok: true, async json() { return { datos }; } };
}

test("Seguimiento agrupa solo sesiones visibles por agente y permite abrir su perfil", async function () {
    const { contexto, documento } = prepararSeguimiento({
        "/api/agentes": respuesta([{ id: "TM001", nombre: "Laura" }, { id: "TM002", nombre: "Ana" }]),
        "/api/sesiones": respuesta([
            { agenteId: "TM001", estado: "Completada", fecha: "16/10/2026" },
            { agenteId: "TM001", estado: "Borrador", fecha: "15/10/2026" },
            { agenteId: "AJENO", estado: "Completada", fecha: "14/10/2026" }
        ])
    });
    await vm.runInContext("cargarSeguimiento()", contexto);
    assert.equal(documento.getElementById("totalAgentesSeguimiento").textContent, "2");
    assert.equal(documento.getElementById("totalCompletadasSeguimiento").textContent, "1");
    assert.equal(documento.getElementById("totalIncompletasSeguimiento").textContent, "1");
    const filas = documento.getElementById("filasSeguimiento").hijos;
    assert.equal(filas.length, 2);
    assert.equal(filas[0].hijos[4].textContent, "16/10/2026");
    assert.equal(filas[0].hijos[5].hijos[0].href, "detalle-agente.html?id=TM001");
    assert.equal(filas[1].hijos[4].textContent, "Sin sesiones");
});

test("Seguimiento no muestra cifras parciales ante fallo o sesión vencida", async function () {
    const fallo = prepararSeguimiento({
        "/api/agentes": respuesta([{ id: "TM001", nombre: "Laura" }]),
        "/api/sesiones": { status: 500, ok: false }
    });
    await vm.runInContext("cargarSeguimiento()", fallo.contexto);
    assert.equal(fallo.documento.getElementById("totalAgentesSeguimiento").textContent, "—");
    assert.equal(fallo.documento.getElementById("reintentarSeguimiento").hidden, false);
    const vencida = prepararSeguimiento({
        "/api/agentes": { status: 401, ok: false },
        "/api/sesiones": respuesta([])
    });
    await vm.runInContext("cargarSeguimiento()", vencida.contexto);
    assert.equal(vencida.contexto.window.location.href, "index.html");
});
