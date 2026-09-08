const agentes = {
    TM001: {
        nombre: "Laura Gómez",
        sesiones: [
            { fecha: "08/08/2026", tipo: "Coaching", clase: "coaching", tema: "Seguimiento de calidad", estado: "Completada" },
            { fecha: "01/08/2026", tipo: "ITGF", clase: "itgf", tema: "Verificación de comportamiento", estado: "Completada" }
        ]
    },
    TM002: {
        nombre: "Juan Pérez",
        sesiones: [
            { fecha: "06/08/2026", tipo: "ITGF", clase: "itgf", tema: "Uso de herramientas", estado: "Completada" }
        ]
    },
    TM003: {
        nombre: "Daniela Ruiz",
        sesiones: [
            { fecha: "05/08/2026", tipo: "Accountability", clase: "accountability", tema: "Cumplimiento de proceso", estado: "Completada" }
        ]
    },
    TM004: {
        nombre: "Andrés Torres",
        sesiones: [
            { fecha: "04/08/2026", tipo: "Huddle", clase: "huddle", tema: "Actualización operativa", estado: "Completada" }
        ]
    },
    TM005: {
        nombre: "Camila Rodríguez",
        sesiones: [
            { fecha: "01/08/2026", tipo: "Verbal Warning", clase: "verbal-warning", tema: "Incumplimiento de política", estado: "Completada" }
        ]
    }
};

document.addEventListener("DOMContentLoaded", function () {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("id");
    const agente = agentes[agenteId];

    if (!agente) {
        window.location.href = "agentes.html";
        return;
    }

    document.title = `Smart Coach - ${agente.nombre}`;
    document.getElementById("nombreAgente").textContent = agente.nombre;
    document.getElementById("nombrePerfil").textContent = agente.nombre;
    document.getElementById("idEmpleado").textContent = agenteId;
    document.getElementById("inicialesAgente").textContent = agente.nombre
        .split(" ")
        .map(function (parte) { return parte[0]; })
        .join("")
        .slice(0, 2);
    document.getElementById("botonNuevaSesion").href = `nueva-sesion.html?agente=${agenteId}`;

    document.getElementById("historialSesiones").innerHTML = agente.sesiones
        .map(function (sesion) {
            return `
                <tr>
                    <td>${sesion.fecha}</td>
                    <td><span class="tipo-sesion ${sesion.clase}">${sesion.tipo}</span></td>
                    <td>${sesion.tema}</td>
                    <td><span class="estado-completada">${sesion.estado}</span></td>
                </tr>
            `;
        })
        .join("");
});
