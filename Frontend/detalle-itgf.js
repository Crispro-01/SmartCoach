const esRevision = new URLSearchParams(window.location.search).get("revision") === "1";
const URL_API_SESION = esRevision ? "/api/revision/sesiones/itgf" : "/api/sesiones/itgf";

document.addEventListener("DOMContentLoaded", async function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const sesionId = parametros.get("sesion");
    const mensaje = document.getElementById("estadoConsulta");
    const destino = document.getElementById("contenidoSesion");
    const volver = document.getElementById("volverAgente");
    if (!agenteId || !/^\d+$/.test(sesionId || "")) { mensaje.textContent = "Falta identificar el agente o la sesión."; return; }
    volver.href = esRevision ? "revision-solicitudes.html" : `detalle-agente.html?id=${encodeURIComponent(agenteId)}`;
    if (esRevision) {
        volver.textContent = "← Volver a solicitudes";
        document.querySelector(".usuario-dashboard span").textContent = "Manager";
    }
    try {
        const respuesta = await fetch(`${URL_API_SESION}/${encodeURIComponent(sesionId)}?agenteId=${encodeURIComponent(agenteId)}`);
        if (respuesta.status === 401) { window.location.href = "index.html"; return; }
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo consultar la sesión.");
        const datos = resultado.datos;
        destino.replaceChildren();
        seccion("Datos de la sesión", [
            ["Agente", `${datos.agenteNombre} (${datos.agenteId})`], ["Coach", datos.coachNombre],
            ["Creada", datos.fechaCreacion], ["Completada", datos.fechaCompletada]
        ], destino);
        seccion("Llamada evaluada", [
            ["Contact ID", datos.contactId], ["Call Driver", datos.callDriver],
            ["Comportamiento trabajado", datos.comportamiento], ["Realizó el comportamiento", siNo(datos.cumplio)],
            ["Observaciones", datos.observaciones]
        ], destino);
        seccion("Compromiso del representante", [
            ["Qué", datos.compromisoQue], ["Cómo", datos.compromisoComo], ["Cuándo", datos.compromisoCuando]
        ], destino);
        mostrarSolicitudEliminacion(datos.id, datos.solicitudEliminacion, destino);
        mensaje.hidden = true; destino.hidden = false;
    } catch (error) { mensaje.textContent = error.message; }
});
