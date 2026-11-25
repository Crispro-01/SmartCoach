import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function rutas(sesion) {
    const contexto = vm.createContext({ sesion });
    vm.runInContext(fs.readFileSync(new URL("../../Frontend/rutas-sesion.js", import.meta.url), "utf8"), contexto);
    return vm.runInContext("rutasDeSesion(sesion)", contexto);
}

test("cada tipo abre su formulario y detalle, con texto y parámetros codificados", () => {
    for (const [clase, tipo, archivo] of [["coaching", "Coaching", "coaching"], ["itgf", "ITGF", "itgf"],
        ["accountability", "Accountability", "correctivo"], ["verbal-warning", "Verbal Warning", "correctivo"]]) {
        const r = rutas({ clase, tipo, agenteId: "TM&001", id: "17" });
        assert.ok(r.continuar.startsWith(`formulario-${archivo}.html?agente=TM%26001&tipo=${encodeURIComponent(tipo)}&borrador=17`));
        assert.ok(r.detalle.startsWith(`detalle-${archivo}.html?agente=TM%26001&sesion=17`));
        if (archivo === "correctivo") assert.ok(r.detalle.endsWith(`&tipo=${encodeURIComponent(tipo)}`));
    }
});
test("revisión del Manager usa el ID de sesión y conserva el tipo correctivo", () => {
    const r = rutas({ clase: "verbal-warning", id: "SOLICITUD-90", sesionId: "23", agenteId: "TM001" });
    assert.equal(r.detalle, "detalle-correctivo.html?agente=TM001&sesion=23&tipo=Verbal%20Warning");
});
test("un tipo desconocido no abre por error una sesión de Coaching", () => {
    assert.equal(rutas({ clase: "__proto__" }), null);
    assert.equal(rutas({ clase: "otro", tipo: "Coaching" }), null);
});
