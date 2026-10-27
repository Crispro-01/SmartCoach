function resumirSeguimiento(agentes, sesiones) {
    // El listado de sesiones ya aplica los permisos del Coach y excluye las archivadas.
    // Se usa el ID como clave para agrupar sin repetir agentes ni consultar datos ajenos.
    const porAgente = new Map(agentes.map(function (agente) {
        return [agente.id, {
            id: agente.id,
            nombre: agente.nombre,
            completadas: 0,
            incompletas: 0,
            ultimaFecha: null
        }];
    }));

    for (const sesion of sesiones) {
        const agente = porAgente.get(sesion.agenteId);
        if (!agente) continue;
        if (sesion.estado === "Completada") agente.completadas += 1;
        else if (sesion.estado === "Borrador") agente.incompletas += 1;
        else continue;
        // /api/sesiones responde de la más reciente a la más antigua.
        if (agente.ultimaFecha === null) agente.ultimaFecha = sesion.fecha;
    }

    return Array.from(porAgente.values());
}

function crearCeldaSeguimiento(contenido, etiqueta) {
    const celda = document.createElement("td");
    celda.dataset.etiqueta = etiqueta;
    celda.textContent = contenido;
    return celda;
}

function crearFilaSeguimiento(agente) {
    const fila = document.createElement("tr");
    fila.append(
        crearCeldaSeguimiento(agente.nombre, "Agente"),
        crearCeldaSeguimiento(agente.id, "ID empleado"),
        crearCeldaSeguimiento(String(agente.completadas), "Completadas"),
        crearCeldaSeguimiento(String(agente.incompletas), "Incompletas"),
        crearCeldaSeguimiento(agente.ultimaFecha || "Sin sesiones", "Última sesión")
    );
    const celdaAccion = crearCeldaSeguimiento("", "Acción");
    const enlace = document.createElement("a");
    enlace.href = `detalle-agente.html?id=${encodeURIComponent(agente.id)}`;
    enlace.className = "boton-principal enlace-boton accion-sesion";
    enlace.textContent = "Ver agente";
    celdaAccion.append(enlace);
    fila.append(celdaAccion);
    return fila;
}

async function cargarSeguimiento() {
    const mensaje = document.getElementById("mensajeSeguimiento");
    const reintentar = document.getElementById("reintentarSeguimiento");
    const cuerpo = document.getElementById("filasSeguimiento");
    const totalAgentes = document.getElementById("totalAgentesSeguimiento");
    const totalCompletadas = document.getElementById("totalCompletadasSeguimiento");
    const totalIncompletas = document.getElementById("totalIncompletasSeguimiento");
    cuerpo.replaceChildren();
    totalAgentes.textContent = totalCompletadas.textContent = totalIncompletas.textContent = "—";
    mensaje.textContent = "Cargando seguimiento…";
    reintentar.hidden = true;

    try {
        const respuestas = await Promise.all([
            fetch("/api/agentes", { credentials: "same-origin" }),
            fetch("/api/sesiones", { credentials: "same-origin" })
        ]);
        if (respuestas.some(function (respuesta) { return respuesta.status === 401; })) {
            window.location.href = "index.html";
            return;
        }
        if (respuestas.some(function (respuesta) { return respuesta.status === 403; })) {
            mensaje.textContent = "No tienes permiso para consultar este seguimiento.";
            return;
        }
        if (respuestas.some(function (respuesta) { return !respuesta.ok; })) {
            throw new Error("No se pudo consultar el seguimiento.");
        }
        const [equipo, historial] = await Promise.all(respuestas.map(function (respuesta) {
            return respuesta.json();
        }));
        if (!Array.isArray(equipo.datos) || !Array.isArray(historial.datos)) {
            throw new Error("El seguimiento recibido no es válido.");
        }

        const resumen = resumirSeguimiento(equipo.datos, historial.datos);
        for (const agente of resumen) cuerpo.append(crearFilaSeguimiento(agente));
        totalAgentes.textContent = String(resumen.length);
        totalCompletadas.textContent = String(resumen.reduce(function (total, agente) {
            return total + agente.completadas;
        }, 0));
        totalIncompletas.textContent = String(resumen.reduce(function (total, agente) {
            return total + agente.incompletas;
        }, 0));
        mensaje.textContent = resumen.length === 0
            ? "Todavía no tienes agentes asignados."
            : resumen.length === 1 ? "1 agente en seguimiento." : `${resumen.length} agentes en seguimiento.`;
    } catch (error) {
        cuerpo.replaceChildren();
        mensaje.textContent = "No se pudo cargar el seguimiento. Revisa la conexión e intenta de nuevo.";
        reintentar.hidden = false;
        console.error("No se pudo cargar el seguimiento:", error.message);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("reintentarSeguimiento").addEventListener("click", cargarSeguimiento);
    cargarSeguimiento();
});
