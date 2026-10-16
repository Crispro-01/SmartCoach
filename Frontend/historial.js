function crearCeldaHistorial(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto || "—";
    return celda;
}

function crearFilaHistorial(sesion) {
    const fila = document.createElement("tr");
    const agente = document.createElement("a");
    agente.href = `detalle-agente.html?id=${encodeURIComponent(sesion.agenteId)}`;
    agente.textContent = sesion.agenteNombre;
    const celdaAgente = document.createElement("td");
    celdaAgente.append(agente);
    const celdaTipo = document.createElement("td");
    const tipo = document.createElement("span");
    tipo.className = "tipo-sesion coaching";
    tipo.textContent = sesion.tipo;
    celdaTipo.append(tipo);

    const celdaEstado = document.createElement("td");
    const celdaAccion = document.createElement("td");
    const incompleta = sesion.estado === "Borrador";
    if (incompleta || sesion.estado === "Completada") {
        const estado = document.createElement("span");
        estado.className = incompleta ? "estado-incompleta" : "estado-completada";
        estado.textContent = incompleta ? "Incompleta" : "Completada";
        celdaEstado.append(estado);
        const accion = document.createElement("a");
        // Se usan los mismos formularios y permisos que en el historial individual.
        accion.href = incompleta
            ? `formulario-coaching.html?agente=${encodeURIComponent(sesion.agenteId)}&tipo=Coaching&borrador=${encodeURIComponent(sesion.id)}`
            : `detalle-coaching.html?agente=${encodeURIComponent(sesion.agenteId)}&sesion=${encodeURIComponent(sesion.id)}`;
        accion.className = "boton-principal enlace-boton accion-sesion";
        accion.textContent = incompleta ? "Continuar" : "Ver";
        celdaAccion.append(accion);
    } else {
        celdaEstado.textContent = sesion.estado || "—";
    }
    fila.append(crearCeldaHistorial(sesion.fecha), celdaAgente,
        crearCeldaHistorial(sesion.agenteId), celdaTipo, celdaEstado, celdaAccion);
    return fila;
}

async function cargarHistorialGeneral() {
    const cuerpo = document.getElementById("historialGeneral");
    const mensaje = document.getElementById("mensajeHistorial");
    const reintentar = document.getElementById("reintentarHistorial");
    cuerpo.replaceChildren();
    mensaje.textContent = "Cargando sesiones…";
    reintentar.hidden = true;
    try {
        const respuesta = await fetch("/api/sesiones", { credentials: "same-origin" });
        if (respuesta.status === 401) {
            window.location.href = "index.html";
            return;
        }
        if (respuesta.status === 403) {
            mensaje.textContent = "No tienes permiso para consultar este historial.";
            return;
        }
        if (!respuesta.ok) throw new Error("No se pudo consultar el historial.");
        const resultado = await respuesta.json();
        if (!Array.isArray(resultado.datos)) throw new Error("Respuesta de historial inválida.");
        resultado.datos.forEach(function (sesion) { cuerpo.append(crearFilaHistorial(sesion)); });
        mensaje.textContent = resultado.datos.length === 0
            ? "Todavía no tienes sesiones de Coaching registradas para tus agentes."
            : resultado.datos.length === 1 ? "1 sesión de Coaching." : `${resultado.datos.length} sesiones de Coaching.`;
    } catch (error) {
        cuerpo.replaceChildren();
        mensaje.textContent = "No se pudo cargar el historial. Revisa la conexión e intenta de nuevo.";
        reintentar.hidden = false;
        console.error("No se pudo cargar el historial:", error.message);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("reintentarHistorial").addEventListener("click", cargarHistorialGeneral);
    cargarHistorialGeneral();
});
