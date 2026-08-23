document.addEventListener("DOMContentLoaded", function () {
    const agentes = {
        TM001: "Laura Gómez",
        TM002: "Juan Pérez",
        TM003: "Daniela Ruiz",
        TM004: "Andrés Torres",
        TM005: "Camila Rodríguez"
    };
    const tiposPermitidos = ["Accountability", "Verbal Warning"];
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const tipoSesion = parametros.get("tipo");
    const fechaHoraInicio = parametros.get("inicio");
    const agenteNombre = agentes[agenteId];
    const formularioCorrectivo = document.getElementById("formularioCorrectivo");

    if (!agenteNombre || !tiposPermitidos.includes(tipoSesion) || !fechaHoraInicio) {
        window.location.href = "agentes.html";
        return;
    }

    document.title = `Smart Coach - ${tipoSesion}`;
    document.getElementById("tituloSesionCorrectiva").textContent = tipoSesion;
    document.getElementById("agenteCorrectivo").value = `${agenteNombre} — ${agenteId}`;
    document.getElementById("agenteIdCorrectivo").value = agenteId;
    document.getElementById("tipoSesionCorrectiva").value = tipoSesion;
    document.getElementById("fechaHoraInicioCorrectiva").value = fechaHoraInicio;
    document.getElementById("volverAgente").href = `detalle-agente.html?id=${agenteId}`;
    document.getElementById("cancelarFormularioCorrectivo").href = `nueva-sesion.html?agente=${agenteId}`;

    formularioCorrectivo.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!formularioCorrectivo.checkValidity()) {
            formularioCorrectivo.reportValidity();
            return;
        }

        window.alert("La sesión correctiva está lista para enviarse al backend.");
    });
});
