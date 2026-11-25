document.addEventListener("DOMContentLoaded", async function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const borradorId = parametros.get("borrador");
    const formulario = document.getElementById("formularioItgf");
    const mensaje = document.getElementById("estadoItgf");
    const guardar = document.getElementById("guardarItgf");
    const completar = document.getElementById("completarItgf");
    const descartar = document.getElementById("descartarItgf");
    const botones = [guardar, completar, descartar];
    const perfil = `detalle-agente.html?id=${encodeURIComponent(agenteId || "")}`;
    const api = "/api/sesiones/itgf";
    const campo = nombre => document.getElementById(nombre);
    if (!agenteId || (borradorId && !/^\d+$/.test(borradorId))) {
        mensaje.textContent = "Falta identificar el agente o la sesión.";
        return;
    }
    campo("volverAgente").href = perfil;

    async function consultar(url, opciones) {
        const respuesta = await fetch(url, { credentials: "same-origin", ...opciones });
        if (respuesta.status === 401) { window.location.href = "index.html"; throw new Error("Inicia sesión para continuar."); }
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo completar la operación.");
        return resultado.datos;
    }
    const campos = {
        contactId: "contactIdItgf", callDriverId: "callDriverItgf", behaviorId: "comportamientoTrabajado",
        observations: "observacionesItgf", commitmentWhat: "compromisoQue",
        commitmentHow: "compromisoComo", commitmentWhen: "compromisoCuando", startTime: "fechaHoraInicioItgf"
    };
    function recoger() {
        const datos = { agentId: agenteId };
        for (const [clave, elemento] of Object.entries(campos)) datos[clave] = campo(elemento).value;
        const cumplio = formulario.querySelector('input[name="cumplioComportamiento"]:checked');
        datos.fulfilled = cumplio ? cumplio.value === "Sí" : null;
        return datos;
    }
    async function enviar(url, method, datos) {
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
        const [agente, catalogos] = await Promise.all([
            consultar(`/api/agentes/${encodeURIComponent(agenteId)}`), consultar("/api/catalogos/coaching")
        ]);
        campo("agenteItgf").value = `${agente.nombre} — ${agente.id}`;
        campo("agenteIdItgf").value = agente.id;
        for (const categoria of catalogos.categoriasCallDriver) {
            const grupo = document.createElement("optgroup"); grupo.label = categoria.nombre;
            for (const opcion of categoria.opciones) {
                const item = document.createElement("option"); item.value = opcion.id; item.textContent = opcion.nombre; grupo.append(item);
            }
            campo("callDriverItgf").append(grupo);
        }
        for (const comportamiento of catalogos.comportamientos) {
            const item = document.createElement("option"); item.value = comportamiento.id; item.textContent = comportamiento.nombre;
            campo("comportamientoTrabajado").append(item);
        }
        if (borradorId) {
            const datos = await consultar(`${api}/borradores/${encodeURIComponent(borradorId)}?agenteId=${encodeURIComponent(agenteId)}`);
            for (const [clave, elemento] of Object.entries(campos)) campo(elemento).value = datos.contenido[clave] ?? "";
            if (typeof datos.contenido.fulfilled === "boolean") {
                formulario.querySelector(`input[name="cumplioComportamiento"][value="${datos.contenido.fulfilled ? "Sí" : "No"}"]`).checked = true;
            }
        } else {
            const ahora = new Date();
            campo("fechaHoraInicioItgf").value = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        botones.forEach(boton => { boton.disabled = false; });
        mensaje.textContent = "";
    } catch (error) { mensaje.textContent = error.message; return; }

    guardar.addEventListener("click", () => ejecutar(async function () {
        // Guardar admite campos vacíos y regresa al historial actualizado del agente.
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
            const datos = recoger();
            if (borradorId) datos.draftId = borradorId;
            await enviar(api, "POST", datos);
            window.location.href = perfil;
        });
    });
});
