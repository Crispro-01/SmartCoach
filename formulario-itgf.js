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
    const tipoSesion = parametros.get("tipo");
    const fechaHoraInicio = parametros.get("inicio");
    const agenteNombre = agentes[agenteId];
    const formularioItgf = document.getElementById("formularioItgf");

    if (!agenteNombre || tipoSesion !== "ITGF" || !fechaHoraInicio) {
        window.location.href = "agentes.html";
        return;
    }

    document.getElementById("agenteItgf").value = `${agenteNombre} — ${agenteId}`;
    document.getElementById("agenteIdItgf").value = agenteId;
    document.getElementById("fechaHoraInicioItgf").value = fechaHoraInicio;
    document.getElementById("volverAgente").href = `detalle-agente.html?id=${agenteId}`;
    document.getElementById("cancelarFormularioItgf").href = `nueva-sesion.html?agente=${agenteId}`;

    formularioItgf.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!formularioItgf.checkValidity()) {
            formularioItgf.reportValidity();
            return;
        }

        window.alert("La sesión ITGF está lista para enviarse al backend.");
    });
});
