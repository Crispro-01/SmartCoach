document.addEventListener("DOMContentLoaded", function () {
    const agentes = {
        TM001: "Laura Gómez",
        TM002: "Juan Pérez",
        TM003: "Daniela Ruiz",
        TM004: "Andrés Torres",
        TM005: "Camila Rodríguez"
    };
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const agenteNombre = agentes[agenteId];
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

        window.alert("El tipo de sesión seleccionado no está disponible.");
    });
});
