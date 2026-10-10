const URL_API_AGENTE = "http://localhost:3000/api/agentes";

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto || "—";
    return celda;
}

function crearEtiquetaTipo(sesion) {
    const etiqueta = document.createElement("span");
    const clasesPermitidas = ["coaching", "itgf", "accountability", "verbal-warning"];

    etiqueta.classList.add("tipo-sesion");
    if (clasesPermitidas.includes(sesion.clase)) {
        etiqueta.classList.add(sesion.clase);
    }
    etiqueta.textContent = sesion.tipo || "Tipo no disponible";

    return etiqueta;
}

function crearCeldaEstado(sesion) {
    const celda = document.createElement("td");
    const estado = sesion.estado;

    if (estado === "Completada") {
        const etiqueta = document.createElement("span");
        etiqueta.className = "estado-completada";
        etiqueta.textContent = estado;
        celda.append(etiqueta);
    } else {
        celda.textContent = estado || "—";
    }

    if (estado === "Borrador" && sesion.clase === "coaching") {
        const enlace = document.createElement("a");
        enlace.href = `formulario-coaching.html?agente=${encodeURIComponent(sesion.agenteId)}&tipo=Coaching&borrador=${encodeURIComponent(sesion.id)}`;
        enlace.textContent = "Continuar borrador";
        enlace.style.marginLeft = "0.75rem";
        celda.append(enlace);
    }

    return celda;
}

function mostrarHistorial(sesiones) {
    const cuerpo = document.getElementById("historialSesiones");
    cuerpo.replaceChildren();

    if (sesiones.length === 0) {
        const fila = document.createElement("tr");
        const celda = crearCelda("Este agente todavía no tiene sesiones registradas.");
        celda.colSpan = 4;
        fila.append(celda);
        cuerpo.append(fila);
        return;
    }

    sesiones.forEach(function (sesion) {
        const fila = document.createElement("tr");
        const celdaTipo = document.createElement("td");

        fila.append(crearCelda(sesion.fecha));
        celdaTipo.append(crearEtiquetaTipo(sesion));
        fila.append(celdaTipo, crearCelda(sesion.tema), crearCeldaEstado(sesion));
        cuerpo.append(fila);
    });
}

function mostrarError(mensaje) {
    document.getElementById("nombreAgente").textContent = mensaje;
    document.getElementById("nombrePerfil").textContent = "No disponible";
    document.getElementById("inicialesAgente").textContent = "—";
    mostrarHistorial([]);
}

async function cargarDetalleAgente() {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("id");

    if (!agenteId) {
        window.location.href = "agentes.html";
        return;
    }

    try {
        const respuesta = await fetch(`${URL_API_AGENTE}/${encodeURIComponent(agenteId)}`);

        if (respuesta.status === 404) {
            window.location.href = "agentes.html";
            return;
        }
        if (!respuesta.ok) {
            throw new Error("El servidor no pudo entregar el detalle del agente.");
        }

        const resultado = await respuesta.json();
        const agente = resultado.datos;

        document.title = `Smart Coach - ${agente.nombre}`;
        document.getElementById("nombreAgente").textContent = agente.nombre;
        document.getElementById("nombrePerfil").textContent = agente.nombre;
        document.getElementById("idEmpleado").textContent = agente.id;
        document.getElementById("inicialesAgente").textContent = agente.nombre
            .split(/\s+/)
            .map(function (parte) { return parte[0]; })
            .join("")
            .slice(0, 2)
            .toUpperCase();
        document.getElementById("botonNuevaSesion").href =
            `nueva-sesion.html?agente=${encodeURIComponent(agente.id)}`;

        mostrarHistorial(agente.sesiones);
    } catch (error) {
        console.error("No se pudo cargar el detalle del agente:", error);
        mostrarError("No se pudo conectar con el servidor");
    }
}

document.addEventListener("DOMContentLoaded", cargarDetalleAgente);
