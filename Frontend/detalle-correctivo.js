const esRevision = new URLSearchParams(window.location.search).get("revision") === "1";
const tipoCorrectivo = new URLSearchParams(window.location.search).get("tipo");
const slugCorrectivo = tipoCorrectivo === "Accountability" ? "accountability" : tipoCorrectivo === "Verbal Warning" ? "verbal-warning" : null;
const URL_API_SESION = (esRevision ? "/api/revision/sesiones/correctivas/" : "/api/sesiones/correctivas/") + slugCorrectivo;

document.addEventListener("DOMContentLoaded", async function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const sesionId = parametros.get("sesion");
    const mensaje = document.getElementById("estadoConsulta");
    const destino = document.getElementById("contenidoSesion");
    const volver = document.getElementById("volverAgente");
    if (!slugCorrectivo || !agenteId || !/^\d+$/.test(sesionId || "")) {
        mensaje.textContent = "Falta identificar el tipo, el agente o la sesión.";
        return;
    }
    document.title = `Smart Coach - ${tipoCorrectivo}`;
    document.getElementById("tituloDetalleCorrectivo").textContent = tipoCorrectivo;
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
            ["Tipo de sesión", datos.tipo], ["Creada", datos.fechaCreacion], ["Completada", datos.fechaCompletada]
        ], destino);
        seccion("Situación y compromisos", [
            ["Situación o dificultad", datos.causa], ["Compromiso del representante", datos.compromisoAgente],
            ["Acompañamiento del Coach", datos.compromisoCoach]
        ], destino);
        mostrarSolicitudEliminacion(datos.id, datos.solicitudEliminacion, destino);
        mensaje.hidden = true; destino.hidden = false;
    } catch (error) { mensaje.textContent = error.message; }
});
