async function cargarResumenCoach() {
    const mensaje = document.getElementById("mensajeResumen");
    const reintentar = document.getElementById("reintentarResumen");
    const agentes = document.getElementById("totalAgentes");
    const sesiones = document.getElementById("totalSesiones");
    const incompletas = document.getElementById("totalIncompletas");
    agentes.textContent = sesiones.textContent = incompletas.textContent = "—";
    mensaje.textContent = "Cargando resumen…";
    reintentar.hidden = true;

    try {
        // Reutiliza las consultas autorizadas del equipo y del historial:
        // los contadores mantienen las mismas reglas de visibilidad, sin listas paralelas.
        const respuestas = await Promise.all([
            fetch("/api/agentes", { credentials: "same-origin" }),
            fetch("/api/sesiones", { credentials: "same-origin" })
        ]);
        if (respuestas.some(function (respuesta) { return respuesta.status === 401; })) {
            window.location.href = "index.html";
            return;
        }
        if (respuestas.some(function (respuesta) { return respuesta.status === 403; })) {
            mensaje.textContent = "No tienes permiso para consultar este resumen.";
            return;
        }
        if (respuestas.some(function (respuesta) { return !respuesta.ok; })) {
            throw new Error("No se pudo consultar el resumen completo.");
        }
        const [equipo, historial] = await Promise.all(respuestas.map(function (respuesta) {
            return respuesta.json();
        }));
        if (!Array.isArray(equipo.datos) || !Array.isArray(historial.datos)) {
            throw new Error("El resumen recibido no es válido.");
        }
        agentes.textContent = String(equipo.datos.length);
        sesiones.textContent = String(historial.datos.length);
        incompletas.textContent = String(historial.datos.filter(function (sesion) {
            return sesion.estado === "Borrador";
        }).length);
        mensaje.textContent = "Las sesiones incluyen incompletas y completadas; no incluyen las archivadas.";
    } catch (error) {
        // Un fallo no equivale a cero registros: se conservan los guiones hasta reintentar.
        mensaje.textContent = "No se pudo cargar el resumen. Revisa la conexión e intenta de nuevo.";
        reintentar.hidden = false;
        console.error("No se pudo cargar el resumen:", error.message);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("reintentarResumen").addEventListener("click", cargarResumenCoach);
    cargarResumenCoach();
});
