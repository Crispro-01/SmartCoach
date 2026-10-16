import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function prepararInterfaz(respuesta) {
    // DOM mínimo para comprobar enlaces y mensajes sin depender de un navegador real.
    function elemento() {
        return {
            children: [], textContent: "", hidden: false,
            append(...hijos) { this.children.push(...hijos); },
            replaceChildren() { this.children = []; }
        };
    }
    const nodos = Object.fromEntries(["historialGeneral", "mensajeHistorial", "reintentarHistorial"]
        .map(function (id) { return [id, elemento()]; }));
    const contexto = vm.createContext({
        document: { createElement: elemento, getElementById(id) { return nodos[id]; }, addEventListener() {} },
        window: { location: { href: "" } },
        fetch: async function () { if (respuesta instanceof Error) throw respuesta; return respuesta; },
        console: { error() {} }
    });
    vm.runInContext(fs.readFileSync(new URL("../../Frontend/historial.js", import.meta.url), "utf8"), contexto);
    return { contexto, nodos };
}

test("historial muestra Incompleta/Continuar y Completada/Ver en columnas distintas", function () {
    const { contexto } = prepararInterfaz();
    for (const [estado, etiqueta, accion, ruta] of [
        ["Borrador", "Incompleta", "Continuar", "formulario-coaching.html?agente=TM001&tipo=Coaching&borrador=7"],
        ["Completada", "Completada", "Ver", "detalle-coaching.html?agente=TM001&sesion=7"]
    ]) {
        contexto.sesion = { id: "7", agenteId: "TM001", agenteNombre: "Laura <prueba>", fecha: "16/10/2026", tipo: "Coaching", estado };
        const fila = vm.runInContext("crearFilaHistorial(sesion)", contexto);
        assert.equal(fila.children.length, 6);
        assert.equal(fila.children[1].children[0].textContent, "Laura <prueba>");
        assert.equal(fila.children[4].children[0].textContent, etiqueta);
        assert.equal(fila.children[5].children[0].textContent, accion);
        assert.equal(fila.children[5].children[0].href, ruta);
        assert.match(fila.children[5].children[0].className, /boton-principal/);
    }
});

test("historial diferencia lista vacía de fallo y ofrece reintentar solo ante fallo", async function () {
    const vacia = prepararInterfaz({ ok: true, status: 200, async json() { return { datos: [] }; } });
    await vm.runInContext("cargarHistorialGeneral()", vacia.contexto);
    assert.match(vacia.nodos.mensajeHistorial.textContent, /Todavía no tienes sesiones/);
    assert.equal(vacia.nodos.reintentarHistorial.hidden, true);
    const fallo = prepararInterfaz(new Error("Sin conexión"));
    await vm.runInContext("cargarHistorialGeneral()", fallo.contexto);
    assert.match(fallo.nodos.mensajeHistorial.textContent, /No se pudo cargar/);
    assert.equal(fallo.nodos.reintentarHistorial.hidden, false);
});

test("historial redirige al login cuando la sesión ha vencido", async function () {
    const { contexto } = prepararInterfaz({ status: 401 });
    await vm.runInContext("cargarHistorialGeneral()", contexto);
    assert.equal(contexto.window.location.href, "index.html");
});

test("historial cargado presenta cada sesión y el contador singular", async function () {
    const { contexto, nodos } = prepararInterfaz({
        status: 200, ok: true,
        async json() { return { datos: [{ id: "7", agenteId: "TM001", agenteNombre: "Laura", estado: "Completada" }] }; }
    });
    await vm.runInContext("cargarHistorialGeneral()", contexto);
    assert.equal(nodos.historialGeneral.children.length, 1);
    assert.equal(nodos.mensajeHistorial.textContent, "1 sesión de Coaching.");
    assert.equal(nodos.reintentarHistorial.hidden, true);
});
