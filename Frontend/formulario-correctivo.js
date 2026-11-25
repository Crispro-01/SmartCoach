document.addEventListener("DOMContentLoaded", async function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const tipo = parametros.get("tipo");
    const slug = tipo === "Accountability" ? "accountability" : tipo === "Verbal Warning" ? "verbal-warning" : null;
    const borradorId = parametros.get("borrador");
    const campo = nombre => document.getElementById(nombre);
    const formulario = campo("formularioCorrectivo");
    const mensaje = campo("estadoCorrectiva");
    const guardar = campo("guardarCorrectiva"), completar = campo("completarCorrectiva"), descartar = campo("descartarCorrectiva");
    const botones = [guardar, completar, descartar];
    const perfil = `detalle-agente.html?id=${encodeURIComponent(agenteId || "")}`;
    const api = `/api/sesiones/correctivas/${slug}`;
    if (!agenteId || !slug || (borradorId && !/^\d+$/.test(borradorId))) {
        mensaje.textContent = "Falta identificar el tipo, el agente o la sesión.";
        return;
    }
    document.title = `Smart Coach - ${tipo}`;
    campo("tituloSesionCorrectiva").textContent = tipo;
    campo("tipoSesionCorrectiva").value = tipo;
    campo("volverAgente").href = perfil;
    async function consultar(url, opciones) {
        const respuesta = await fetch(url, { credentials: "same-origin", ...opciones });
        if (respuesta.status === 401) { window.location.href = "index.html"; throw new Error("Inicia sesión para continuar."); }
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo completar la operación.");
        return resultado.datos;
    }
    const campos = { cause: "causaSituacion", agentCommitment: "compromisoRepresentante",
        coachCommitment: "compromisoCoach", startTime: "fechaHoraInicioCorrectiva" };
    function recoger() {
        const datos = { agentId: agenteId };
        for (const [clave, elemento] of Object.entries(campos)) datos[clave] = campo(elemento).value;
        return datos;
    }
    function enviar(url, method, datos) {
        return consultar(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
    }
    async function ejecutar(accion) {
        botones.forEach(boton => { boton.disabled = true; });
        mensaje.textContent = "Guardando cambios…";
        try { await accion(); } catch (error) {
            mensaje.textContent = error.message;
            botones.forEach(boton => { boton.disabled = false; });
        }
    }
    try {
        const agente = await consultar(`/api/agentes/${encodeURIComponent(agenteId)}`);
        campo("agenteCorrectivo").value = `${agente.nombre} — ${agente.id}`;
        campo("agenteIdCorrectivo").value = agente.id;
        if (borradorId) {
            const datos = await consultar(`${api}/borradores/${encodeURIComponent(borradorId)}?agenteId=${encodeURIComponent(agenteId)}`);
            for (const [clave, elemento] of Object.entries(campos)) campo(elemento).value = datos.contenido[clave] ?? "";
        } else {
            const ahora = new Date();
            const inicio = parametros.get("inicio");
            campo("fechaHoraInicioCorrectiva").value = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(inicio || "")
                ? inicio : new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        botones.forEach(boton => { boton.disabled = false; }); mensaje.textContent = "";
    } catch (error) { mensaje.textContent = error.message; return; }
    guardar.addEventListener("click", () => ejecutar(async function () {
        await enviar(borradorId ? `${api}/borradores/${encodeURIComponent(borradorId)}` : `${api}/borradores`,
            borradorId ? "PUT" : "POST", recoger());
        window.location.href = perfil;
    }));
    descartar.addEventListener("click", async function () {
        if (!await window.smartCoachConfirm("¿Confirmas que quieres descartar esta sesión?")) return;
        await ejecutar(async function () {
            if (borradorId) await enviar(`${api}/borradores/${encodeURIComponent(borradorId)}`, "DELETE", { agentId: agenteId });
            window.location.href = perfil;
        });
    });
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (!formulario.reportValidity()) return;
        ejecutar(async function () {
            const datos = recoger(); if (borradorId) datos.draftId = borradorId;
            await enviar(api, "POST", datos); window.location.href = perfil;
        });
    });
});
