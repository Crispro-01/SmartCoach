const URL_REVISION = "/api/revision/solicitudes";

function agregarCampo(lista, nombre, valor) {
    const termino = document.createElement("dt");
    termino.textContent = nombre;
    const definicion = document.createElement("dd");
    definicion.textContent = valor ?? "—";
    lista.append(termino, definicion);
}

function mostrarSolicitud(solicitud, destino) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-detalle-coaching solicitud-revision";
    const titulo = document.createElement("h3");
    titulo.textContent = `Solicitud #${solicitud.id} · ${solicitud.estado}`;
    const campos = document.createElement("dl");
    campos.className = "campos-detalle-coaching";
    agregarCampo(campos, "Sesión", `#${solicitud.sesionId} · ${solicitud.tema}`);
    agregarCampo(campos, "Agente", `${solicitud.agenteNombre} (${solicitud.agenteId})`);
    agregarCampo(campos, "Coach solicitante", `${solicitud.coachNombre} (${solicitud.coachId})`);
    agregarCampo(campos, "Fecha", solicitud.fechaSolicitud);
    agregarCampo(campos, "Motivo de la solicitud", solicitud.motivo);
    if (solicitud.estado !== "PENDIENTE") {
        agregarCampo(campos, "Revisó", solicitud.revisorNombre);
        agregarCampo(campos, "Fecha de revisión", solicitud.fechaResolucion);
        agregarCampo(campos, "Justificación de la decisión", solicitud.respuestaRevision);
    }
    const enlace = document.createElement("a");
    enlace.href = `detalle-coaching.html?agente=${encodeURIComponent(solicitud.agenteId)}&sesion=${encodeURIComponent(solicitud.sesionId)}&revision=1`;
    enlace.textContent = "Ver sesión completa";
    tarjeta.append(titulo, campos, enlace);

    if (solicitud.estado === "PENDIENTE") {
        const formulario = document.createElement("form");
        const etiqueta = document.createElement("label");
        const idCampo = `justificacion-${solicitud.id}`;
        etiqueta.htmlFor = idCampo;
        etiqueta.textContent = "Justificación de tu decisión (mínimo 20 caracteres)";
        const justificacion = document.createElement("textarea");
        justificacion.id = idCampo;
        justificacion.minLength = 20;
        justificacion.maxLength = 1000;
        justificacion.required = true;
        justificacion.rows = 4;
        const acciones = document.createElement("div");
        acciones.className = "acciones-formulario";
        const rechazar = document.createElement("button");
        rechazar.type = "submit";
        rechazar.value = "RECHAZADA";
        rechazar.className = "boton-secundario";
        rechazar.textContent = "Rechazar solicitud";
        const aprobar = document.createElement("button");
        aprobar.type = "submit";
        aprobar.value = "APROBADA";
        aprobar.className = "boton-principal";
        aprobar.textContent = "Aprobar y archivar sesión";
        acciones.append(rechazar, aprobar);
        const mensaje = document.createElement("p");
        mensaje.setAttribute("role", "status");
        formulario.append(etiqueta, justificacion, acciones, mensaje);
        tarjeta.append(formulario);

        formulario.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            const decision = evento.submitter?.value;
            if (!["APROBADA", "RECHAZADA"].includes(decision)) {
                mensaje.textContent = "Selecciona Aprobar o Rechazar.";
                return;
            }
            if (decision === "APROBADA" && !window.confirm(
                "Esta aprobación ocultará el Coaching del historial normal, pero lo conservará en MySQL. ¿Continuar?"
            )) return;
            rechazar.disabled = true;
            aprobar.disabled = true;
            mensaje.textContent = "Guardando la revisión...";
            try {
                const respuesta = await fetch(`${URL_REVISION}/${encodeURIComponent(solicitud.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ decision, justificacion: justificacion.value })
                });
                const resultado = await respuesta.json();
                if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo guardar la revisión.");
                await cargarSolicitudes();
            } catch (error) {
                mensaje.textContent = error.message;
                rechazar.disabled = false;
                aprobar.disabled = false;
            }
        });
    }
    destino.append(tarjeta);
}

async function cargarSolicitudes() {
    const estado = document.getElementById("estadoRevision");
    const destino = document.getElementById("listaSolicitudes");
    estado.textContent = "Cargando solicitudes...";
    try {
        const respuesta = await fetch(URL_REVISION);
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudieron cargar las solicitudes.");
        destino.replaceChildren();
        if (!resultado.datos.length) {
            estado.textContent = "No hay solicitudes de eliminación para tu equipo.";
            return;
        }
        for (const solicitud of resultado.datos) mostrarSolicitud(solicitud, destino);
        estado.textContent = `${resultado.datos.filter(function (item) { return item.estado === "PENDIENTE"; }).length} solicitud(es) pendiente(s).`;
    } catch (error) {
        estado.textContent = error.message;
    }
}

document.addEventListener("DOMContentLoaded", cargarSolicitudes);
