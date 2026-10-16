import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function preparar(archivo) {
    function elemento() {
        return {
            children: [], dataset: {}, textContent: "", classList: { add() {} },
            append(...hijos) { this.children.push(...hijos); },
            replaceChildren() { this.children = []; }
        };
    }
    const historial = elemento();
    const contexto = vm.createContext({
        document: {
            createElement: elemento, addEventListener() {},
            getElementById() { return historial; }
        }
    });
    vm.runInContext(fs.readFileSync(new URL(`../../Frontend/${archivo}`, import.meta.url), "utf8"), contexto);
    return { contexto, historial };
}

test("las tarjetas móviles de agentes conservan sus cinco campos y el enlace", function () {
    const { contexto } = preparar("agentes.js");
    const fila = vm.runInContext('crearFilaAgente({ id: "TM001", nombre: "Laura Gómez", sesiones: [] })', contexto);
    assert.deepEqual(Array.from(fila.children, celda => celda.dataset.etiqueta),
        ["Agente", "ID empleado", "Última sesión", "Tipo de sesión", "Acción"]);
    assert.equal(fila.children[4].children[0].href, "detalle-agente.html?id=TM001");
});

test("el perfil móvil mantiene Estado y Acción separados para ambos estados", function () {
    const { contexto, historial } = preparar("detalle-agente.js");
    for (const [estado, accion] of [["Borrador", "Continuar"], ["Completada", "Ver"]]) {
        contexto.sesiones = [{ id: "7", agenteId: "TM001", fecha: "16/10/2026", clase: "coaching", tipo: "Coaching", estado }];
        vm.runInContext("mostrarHistorial(sesiones)", contexto);
        const celdas = historial.children[0].children;
        assert.deepEqual(Array.from(celdas, celda => celda.dataset.etiqueta),
            ["Fecha", "Tipo de sesión", "Estado", "Acción"]);
        assert.equal(celdas[2].children[0].textContent, estado === "Borrador" ? "Incompleta" : "Completada");
        assert.equal(celdas[3].children[0].textContent, accion);
    }
});

test("el historial vacío conserva un mensaje completo sin etiquetas de sesión", function () {
    const { contexto, historial } = preparar("detalle-agente.js");
    vm.runInContext("mostrarHistorial([])", contexto);
    const celda = historial.children[0].children[0];
    assert.equal(celda.colSpan, 4);
    assert.equal(celda.dataset.etiqueta, undefined);
    assert.match(celda.textContent, /todavía no tiene sesiones/);
});
