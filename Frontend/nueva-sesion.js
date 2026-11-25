document.addEventListener("DOMContentLoaded", async function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    let agenteNombre;
    try {
        const respuesta = await fetch(`/api/agentes/${encodeURIComponent(agenteId || "")}`);
        if (respuesta.status === 401) { window.location.href = "index.html"; return; }
        if (!respuesta.ok) throw new Error("No se pudo consultar el agente.");
        agenteNombre = (await respuesta.json()).datos.nombre;
    } catch { window.location.href = "agentes.html"; return; }
    const campoFechaHoraInicio = document.getElementById("fechaHoraInicio");
    const formularioSesion = document.getElementById("formularioSesion");

    if (!agenteNombre) {
        window.location.href = "agentes.html";
        return;
    }

    document.getElementById("agenteSesion").value = `${agenteNombre} — ${agenteId}`;
    document.getElementById("agenteId").value = agenteId;
    document.getElementById("cancelarNuevaSesion").href = `detalle-agente.html?id=${agenteId}`;

    const inicioSesion = new Date();
    const desfaseZonaHoraria = inicioSesion.getTimezoneOffset() * 60000;
    const fechaHoraLocal = new Date(
        inicioSesion.getTime() - desfaseZonaHoraria
    )
        .toISOString()
        .slice(0, 16);

    campoFechaHoraInicio.value = fechaHoraLocal;

    formularioSesion.addEventListener("submit", function (evento) {
        evento.preventDefault();

        const tipoSesion = document.getElementById("tipoSesion").value;

        if (tipoSesion === "ITGF") {
            const destino = new URL("formulario-itgf.html", window.location.href);
            destino.searchParams.set("agente", agenteId);
            destino.searchParams.set("tipo", tipoSesion);
            destino.searchParams.set("inicio", campoFechaHoraInicio.value);
            window.location.href = destino.toString();
            return;
        }

        if (tipoSesion === "Coaching") {
            const destino = new URL("formulario-coaching.html", window.location.href);
            destino.searchParams.set("agente", agenteId);
            destino.searchParams.set("tipo", tipoSesion);
            destino.searchParams.set("inicio", campoFechaHoraInicio.value);
            window.location.href = destino.toString();
            return;
        }

        if (tipoSesion === "Accountability" || tipoSesion === "Verbal Warning") {
            const destino = new URL("formulario-correctivo.html", window.location.href);
            destino.searchParams.set("agente", agenteId);
            destino.searchParams.set("tipo", tipoSesion);
            destino.searchParams.set("inicio", campoFechaHoraInicio.value);
            window.location.href = destino.toString();
            return;
        }

        window.smartCoachAlert("El tipo de sesión seleccionado no está disponible.");
    });
});
