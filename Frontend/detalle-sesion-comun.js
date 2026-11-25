function valor(dato) {
    return dato === null || dato === undefined || dato === "" ? "—" : String(dato);
}

function siNo(dato) {
    return dato === null || dato === undefined ? "—" : dato ? "Sí" : "No";
}

function seccion(titulo, campos, destino) {
    const tarjeta = document.createElement("section");
    tarjeta.className = "tarjeta-detalle-coaching";
    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;
    const lista = document.createElement("dl");
    lista.className = "campos-detalle-coaching";
    for (const [etiqueta, dato] of campos) {
        const nombre = document.createElement("dt");
        nombre.textContent = etiqueta;
        const contenido = document.createElement("dd");
        contenido.textContent = valor(dato);
        lista.append(nombre, contenido);
    }
    tarjeta.append(encabezado, lista);
    destino.append(tarjeta);
    return tarjeta;
}

function tablaEvaluaciones(titulo, evaluaciones, destino, campoResultado) {
    const tarjeta = document.createElement("section");
    tarjeta.className = "tarjeta-detalle-coaching";
    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;
    const contenedor = document.createElement("div");
    contenedor.className = "contenedor-tabla";
    const tabla = document.createElement("table");
    tabla.className = "tabla-agentes";
    const cabecera = document.createElement("thead");
    const filaCabecera = document.createElement("tr");
    for (const nombre of ["Comportamiento", "Resultado"]) {
        const th = document.createElement("th");
        th.textContent = nombre;
        filaCabecera.append(th);
    }
    cabecera.append(filaCabecera);
    const cuerpo = document.createElement("tbody");
    for (const evaluacion of evaluaciones) {
        const fila = document.createElement("tr");
        for (const dato of [evaluacion.comportamiento, siNo(evaluacion[campoResultado])]) {
            const celda = document.createElement("td");
            celda.textContent = dato;
            fila.append(celda);
        }
        cuerpo.append(fila);
    }
    tabla.append(cabecera, cuerpo);
    contenedor.append(tabla);
    tarjeta.append(encabezado, contenedor);
    destino.append(tarjeta);
}

function mostrarSolicitudEliminacion(sesionId, solicitud, destino) {
    const campos = solicitud ? [
        ["Estado", solicitud.estado],
        ["Fecha de solicitud", solicitud.fechaSolicitud],
        ["Motivo registrado", solicitud.motivo]
    ] : [["Estado", "No se ha solicitado la eliminación"]];
    if (solicitud?.respuestaRevision) campos.push(["Respuesta de revisión", solicitud.respuestaRevision]);
    const tarjeta = seccion("Solicitud de eliminación", campos, destino);
    tarjeta.classList.add("solicitud-eliminacion");
    const aclaracion = document.createElement("p");
    aclaracion.textContent = esRevision
        ? "La sesión y las decisiones de revisión se conservan para su consulta y trazabilidad."
        : "Enviar una solicitud no borra la sesión. Quedará registrada con tu identidad y motivo para una revisión posterior.";
    tarjeta.append(aclaracion);

    if (esRevision) return;
    if (solicitud && solicitud.estado !== "RECHAZADA") return;

    const botonSolicitar = document.createElement("button");
    botonSolicitar.type = "button";
    botonSolicitar.className = "boton-principal";
    botonSolicitar.textContent = "Solicitar eliminación";
    botonSolicitar.setAttribute("aria-controls", "formularioSolicitudEliminacion");
    botonSolicitar.setAttribute("aria-expanded", "false");
    tarjeta.append(botonSolicitar);

    const formulario = document.createElement("form");
    formulario.id = "formularioSolicitudEliminacion";
    formulario.hidden = true;
    const etiqueta = document.createElement("label");
    etiqueta.htmlFor = "motivoEliminacion";
    etiqueta.textContent = "¿Por qué se debería eliminar esta sesión?";
    const motivo = document.createElement("textarea");
    motivo.id = "motivoEliminacion";
    motivo.name = "motivo";
    motivo.minLength = 20;
    motivo.maxLength = 1000;
    motivo.required = true;
    motivo.rows = 4;
    const boton = document.createElement("button");
    boton.type = "submit";
    boton.className = "boton-principal";
    boton.textContent = "Enviar solicitud de eliminación";
    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "boton-secundario";
    cancelar.textContent = "Cancelar";
    const acciones = document.createElement("div");
    acciones.className = "acciones-formulario";
    acciones.append(cancelar, boton);
    const mensaje = document.createElement("p");
    mensaje.setAttribute("role", "status");
    formulario.append(etiqueta, motivo, acciones, mensaje);
    tarjeta.append(formulario);

    botonSolicitar.addEventListener("click", function () {
        botonSolicitar.hidden = true;
        botonSolicitar.setAttribute("aria-expanded", "true");
        formulario.hidden = false;
        motivo.focus();
    });

    cancelar.addEventListener("click", function () {
        formulario.reset();
        formulario.hidden = true;
        mensaje.textContent = "";
        botonSolicitar.hidden = false;
        botonSolicitar.setAttribute("aria-expanded", "false");
        botonSolicitar.focus();
    });

    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        boton.disabled = true;
        cancelar.disabled = true;
        mensaje.textContent = "Registrando solicitud...";
        try {
            const respuesta = await fetch(`${URL_API_SESION}/${encodeURIComponent(sesionId)}/solicitudes-eliminacion`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ motivo: motivo.value })
            });
            const resultado = await respuesta.json();
            if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo registrar la solicitud.");
            window.location.reload();
        } catch (error) {
            mensaje.textContent = error.message;
            boton.disabled = false;
            cancelar.disabled = false;
        }
    });
}
