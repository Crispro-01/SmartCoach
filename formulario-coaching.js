document.addEventListener("DOMContentLoaded", function () {
    const agentes = {
        TM001: "Laura Gómez",
        TM002: "Juan Pérez",
        TM003: "Daniela Ruiz",
        TM004: "Andrés Torres",
        TM005: "Camila Rodríguez"
    };

    const comportamientos = [
        { clave: "properGreeting", nombre: "Buen saludo" },
        { clave: "accountVerification", nombre: "Verificación de la cuenta" },
        { clave: "paraphraseNeed", nombre: "Parafrasear la necesidad del cliente" },
        { clave: "ensureHelp", nombre: "Asegurar ayuda" },
        { clave: "verbalizeAudit", nombre: "Verbalizar la auditoría visual" },
        { clave: "relevantQuestions", nombre: "Preguntas de sondeo relevantes" },
        { clave: "toolsUsage", nombre: "Uso de herramientas" },
        { clave: "resolution", nombre: "Resolución" },
        { clave: "documentation", nombre: "Dejar documentación dentro de la cuenta" },
        { clave: "selfHelpPromotion", nombre: "Promover opciones de autoayuda" },
        { clave: "recapitulation", nombre: "Recapitulación" },
        { clave: "offerProducts", nombre: "Ofrecer productos o servicios adecuados" },
        { clave: "adjacentProblems", nombre: "Preguntar por problemas adyacentes" },
        { clave: "thankCustomer", nombre: "Agradecer al cliente y cerrar la llamada" }
    ];

    const categoriasCallDriver = [
        {
            nombre: "Facturación y pagos",
            opciones: [
                "Cobros no reconocidos / Factura alta",
                "Acuerdos de pago (Payment arrangements)",
                "Pagos rechazados o no aplicados",
                "Consulta de saldo / Estado de cuenta",
                "Ajustes de factura"
            ]
        },
        {
            nombre: "Soporte técnico",
            opciones: [
                "Sin servicio (No service)",
                "Reseteo de credenciales",
                "Troubleshooting / Configuración",
                "Problemas de conectividad",
                "Problemas con el equipo"
            ]
        },
        {
            nombre: "Retención y gestión de cuenta",
            opciones: [
                "Cancelación de servicio (Disconnect)",
                "Cambio de titularidad (Transfer of Responsibility)",
                "Cambio de domicilio (Move order)",
                "Suspensión temporal de servicio",
                "Reactivación de cuenta"
            ]
        },
        {
            nombre: "Ventas y mejoras",
            opciones: [
                "Upgrade de equipo / plan",
                "Agregar líneas (Add-a-line)",
                "Consulta de promociones",
                "Contratación de servicios adicionales",
                "Cambio de plan"
            ]
        },
        {
            nombre: "Logística e información",
            opciones: [
                "WISMO (Where Is My Order?)",
                "Garantías / Devoluciones (RMA)",
                "Consulta general de servicios",
                "Seguimiento de orden",
                "Información de cuenta"
            ]
        }
    ];

    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const tipoSesion = parametros.get("tipo");
    const fechaHoraInicio = parametros.get("inicio");
    const agenteNombre = agentes[agenteId];
    const formularioCoaching = document.getElementById("formularioCoaching");

    if (!agenteNombre || tipoSesion !== "Coaching" || !fechaHoraInicio) {
        window.location.href = "agentes.html";
        return;
    }

    document.getElementById("agenteCoaching").value = `${agenteNombre} — ${agenteId}`;
    document.getElementById("agenteIdCoaching").value = agenteId;
    document.getElementById("fechaHoraInicioCoaching").value = fechaHoraInicio;
    document.getElementById("volverAgente").href = `detalle-agente.html?id=${agenteId}`;
    document.getElementById("cancelarFormularioCoaching").href = `nueva-sesion.html?agente=${agenteId}`;

    const cronometroCoaching = document.getElementById("cronometroCoaching");
    const tiempoCoaching = document.getElementById("tiempoCoaching");
    const alertaTiempoCoaching = document.getElementById("alertaTiempoCoaching");
    const duracionCoachingSegundos = document.getElementById("duracionCoachingSegundos");
    const botonIniciarCronometro = document.getElementById("iniciarCronometroCoaching");
    const claveInicioCronometro = `smartCoach:inicioCoaching:${agenteId}:${fechaHoraInicio}`;
    let inicioCoaching = null;
    let intervaloCronometro = null;
    const limiteCoachingSegundos = 20 * 60;

    function formatearTiempo(totalSegundos) {
        const minutos = Math.floor(totalSegundos / 60).toString().padStart(2, "0");
        const segundos = (totalSegundos % 60).toString().padStart(2, "0");
        return `${minutos}:${segundos}`;
    }

    function actualizarCronometroCoaching() {
        if (inicioCoaching === null) {
            return;
        }

        const segundosTranscurridos = Math.max(0, Math.floor((Date.now() - inicioCoaching) / 1000));
        tiempoCoaching.textContent = formatearTiempo(segundosTranscurridos);
        duracionCoachingSegundos.value = segundosTranscurridos.toString();

        if (segundosTranscurridos >= limiteCoachingSegundos) {
            cronometroCoaching.classList.add("tiempo-agotado");
            alertaTiempoCoaching.hidden = false;
        } else {
            cronometroCoaching.classList.remove("tiempo-agotado");
            alertaTiempoCoaching.hidden = true;
        }
    }

    function activarCronometroCoaching() {
        botonIniciarCronometro.disabled = true;
        botonIniciarCronometro.textContent = "✓";
        botonIniciarCronometro.setAttribute("aria-label", "Cronómetro de Coaching iniciado");
        cronometroCoaching.classList.add("cronometro-activo");
        actualizarCronometroCoaching();

        if (intervaloCronometro === null) {
            intervaloCronometro = window.setInterval(actualizarCronometroCoaching, 1000);
        }
    }

    botonIniciarCronometro.addEventListener("click", function () {
        inicioCoaching = Date.now();
        window.localStorage.setItem(claveInicioCronometro, inicioCoaching.toString());
        duracionCoachingSegundos.value = "0";
        activarCronometroCoaching();
    });

    const inicioGuardado = Number(window.localStorage.getItem(claveInicioCronometro));

    if (Number.isFinite(inicioGuardado) && inicioGuardado > 0 && inicioGuardado <= Date.now()) {
        inicioCoaching = inicioGuardado;
        activarCronometroCoaching();
    }

    function cargarCallDrivers(selector) {
        categoriasCallDriver.forEach(function (categoria) {
            const grupo = document.createElement("optgroup");
            grupo.label = categoria.nombre;

            categoria.opciones.forEach(function (callDriver) {
                const opcion = document.createElement("option");
                opcion.value = callDriver;
                opcion.textContent = callDriver;
                grupo.appendChild(opcion);
            });

            selector.appendChild(grupo);
        });
    }

    cargarCallDrivers(document.getElementById("callDriver1"));
    cargarCallDrivers(document.getElementById("callDriver2"));

    function cargarComportamientos(selector) {
        comportamientos.forEach(function (comportamiento) {
            const opcion = document.createElement("option");
            opcion.value = comportamiento.clave;
            opcion.textContent = comportamiento.nombre;
            selector.appendChild(opcion);
        });
    }

    cargarComportamientos(document.getElementById("comportamientoTrabajadoCoaching"));

    function crearOpcionComportamiento(prefijo, comportamiento, valor) {
        const etiqueta = document.createElement("label");
        const radio = document.createElement("input");

        radio.type = "radio";
        radio.name = `${prefijo}_${comportamiento.clave}`;
        radio.value = valor;
        radio.required = true;

        etiqueta.appendChild(radio);
        etiqueta.append(valor);
        return etiqueta;
    }

    function crearListaComportamientos(contenedorId, prefijo) {
        const contenedor = document.getElementById(contenedorId);

        comportamientos.forEach(function (comportamiento) {
            const fila = document.createElement("div");
            const nombre = document.createElement("span");
            const opciones = document.createElement("div");

            fila.className = "fila-comportamiento";
            nombre.className = "nombre-comportamiento";
            nombre.textContent = comportamiento.nombre;
            opciones.className = "opciones-comportamiento";
            opciones.appendChild(crearOpcionComportamiento(prefijo, comportamiento, "Sí"));
            opciones.appendChild(crearOpcionComportamiento(prefijo, comportamiento, "No"));

            fila.appendChild(nombre);
            fila.appendChild(opciones);
            contenedor.appendChild(fila);
        });
    }

    function crearResultadosFinales() {
        const contenedor = document.getElementById("comportamientosFinales");

        comportamientos.forEach(function (comportamiento) {
            const fila = document.createElement("div");
            const nombre = document.createElement("span");
            const resultado = document.createElement("span");
            const valorOculto = document.createElement("input");

            fila.className = "fila-comportamiento fila-resultado-final";
            nombre.className = "nombre-comportamiento";
            nombre.textContent = comportamiento.nombre;
            resultado.id = `resultado_${comportamiento.clave}`;
            resultado.className = "estado-comportamiento pendiente";
            resultado.textContent = "Pendiente";
            valorOculto.type = "hidden";
            valorOculto.id = `final_${comportamiento.clave}`;
            valorOculto.name = `final_${comportamiento.clave}`;

            fila.appendChild(nombre);
            fila.appendChild(resultado);
            fila.appendChild(valorOculto);
            contenedor.appendChild(fila);
        });
    }

    crearListaComportamientos("comportamientosLlamada1", "call1");
    crearListaComportamientos("comportamientosLlamada2", "call2");
    crearResultadosFinales();

    const comportamientoTrabajado = document.getElementById("comportamientoTrabajadoCoaching");
    const resultadoComportamientoTrabajado = document.getElementById("resultadoComportamientoTrabajado");
    const comportamientoRealizadoValor = document.getElementById("comportamientoRealizadoValor");

    function actualizarComportamientoTrabajado() {
        const claveSeleccionada = comportamientoTrabajado.value;
        const resultadoFinal = claveSeleccionada
            ? document.getElementById(`final_${claveSeleccionada}`).value
            : "";

        if (!resultadoFinal) {
            resultadoComportamientoTrabajado.textContent = "Pendiente";
            resultadoComportamientoTrabajado.className = "resultado-mejora-kpi pendiente";
            comportamientoRealizadoValor.value = "";
            return;
        }

        const realizoComportamiento = resultadoFinal === "Sí";
        resultadoComportamientoTrabajado.textContent = realizoComportamiento
            ? "Sí realizó el comportamiento trabajado."
            : "No realizó el comportamiento trabajado.";
        resultadoComportamientoTrabajado.className = `resultado-mejora-kpi ${realizoComportamiento ? "mejora" : "sin-mejora"}`;
        comportamientoRealizadoValor.value = realizoComportamiento ? "Sí" : "No";
    }

    comportamientoTrabajado.addEventListener("change", actualizarComportamientoTrabajado);

    function actualizarResultadoFinal(clave) {
        const llamada1 = formularioCoaching.querySelector(`input[name="call1_${clave}"]:checked`);
        const llamada2 = formularioCoaching.querySelector(`input[name="call2_${clave}"]:checked`);
        const resultado = document.getElementById(`resultado_${clave}`);
        const valorOculto = document.getElementById(`final_${clave}`);

        if (!llamada1 || !llamada2) {
            resultado.textContent = "Pendiente";
            resultado.className = "estado-comportamiento pendiente";
            valorOculto.value = "";
            return;
        }

        const valorFinal = llamada1.value === "Sí" && llamada2.value === "Sí" ? "Sí" : "No";
        resultado.textContent = valorFinal;
        resultado.className = `estado-comportamiento ${valorFinal === "Sí" ? "cumple" : "no-cumple"}`;
        valorOculto.value = valorFinal;
        actualizarComportamientoTrabajado();
    }

    formularioCoaching.addEventListener("change", function (evento) {
        const campo = evento.target;

        if (campo.matches('input[type="radio"][name^="call1_"]') || campo.matches('input[type="radio"][name^="call2_"]')) {
            actualizarResultadoFinal(campo.name.replace(/^call[12]_/, ""));
        }
    });

    const aperturaComportamiento = document.getElementById("aperturaComportamiento");
    const tipoSeguimiento = document.getElementById("tipoSeguimientoCoaching");
    const numeroSesion = document.getElementById("numeroSesionCoaching");
    const tipoSeguimientoValor = document.getElementById("tipoSeguimientoValor");
    const numeroSesionValor = document.getElementById("numeroSesionValor");
    const avisoApertura = document.getElementById("avisoApertura");
    const contenedorMetaCoachingAnterior = document.getElementById("contenedorMetaCoachingAnterior");
    const metaCoachingAnterior = document.getElementById("metaCoachingAnterior");
    const resultadoActual = document.getElementById("resultadoActual");
    const contenedorResultadoMejora = document.getElementById("contenedorResultadoMejora");
    const resultadoMejoraKpi = document.getElementById("resultadoMejoraKpi");
    const mejoraKpiValor = document.getElementById("mejoraKpiValor");

    function actualizarResultadoMejoraKpi() {
        const esSeguimiento = aperturaComportamiento.value === "No";
        contenedorResultadoMejora.hidden = !esSeguimiento;

        if (!esSeguimiento) {
            mejoraKpiValor.value = "";
            return;
        }

        const metaAnterior = Number.parseFloat(metaCoachingAnterior.value);
        const valorActual = Number.parseFloat(resultadoActual.value);

        if (Number.isNaN(metaAnterior) || Number.isNaN(valorActual)) {
            resultadoMejoraKpi.textContent = "Pendiente";
            resultadoMejoraKpi.className = "resultado-mejora-kpi pendiente";
            mejoraKpiValor.value = "";
            return;
        }

        const seEvidencioMejora = valorActual >= metaAnterior;
        resultadoMejoraKpi.textContent = seEvidencioMejora
            ? "Sí hubo mejora en el KPI."
            : "No hubo mejora en el KPI.";
        resultadoMejoraKpi.className = `resultado-mejora-kpi ${seEvidencioMejora ? "mejora" : "sin-mejora"}`;
        mejoraKpiValor.value = seEvidencioMejora ? "Sí" : "No";
    }

    function sincronizarDetalleCoaching() {
        const esApertura = aperturaComportamiento.value === "Sí";
        const esSeguimiento = aperturaComportamiento.value === "No";

        if (esApertura) {
            tipoSeguimiento.value = "Constructivo";
            numeroSesion.value = "1";
        }

        tipoSeguimiento.disabled = esApertura;
        numeroSesion.readOnly = esApertura;
        avisoApertura.hidden = !esApertura;
        contenedorMetaCoachingAnterior.hidden = !esSeguimiento;
        metaCoachingAnterior.disabled = !esSeguimiento;
        metaCoachingAnterior.required = esSeguimiento;

        if (!esSeguimiento) {
            metaCoachingAnterior.value = "";
        }

        tipoSeguimientoValor.value = tipoSeguimiento.value;
        numeroSesionValor.value = numeroSesion.value;
        actualizarResultadoMejoraKpi();
    }

    aperturaComportamiento.addEventListener("change", sincronizarDetalleCoaching);
    tipoSeguimiento.addEventListener("change", sincronizarDetalleCoaching);
    numeroSesion.addEventListener("input", sincronizarDetalleCoaching);
    metaCoachingAnterior.addEventListener("input", actualizarResultadoMejoraKpi);
    resultadoActual.addEventListener("input", actualizarResultadoMejoraKpi);

    const archivosCoaching = document.getElementById("archivosCoaching");
    const resumenArchivos = document.getElementById("resumenArchivos");

    archivosCoaching.addEventListener("change", function () {
        const cantidad = archivosCoaching.files.length;
        resumenArchivos.textContent = cantidad === 0
            ? "No hay archivos seleccionados."
            : `${cantidad} archivo${cantidad === 1 ? "" : "s"} seleccionado${cantidad === 1 ? "" : "s"}.`;
    });

    document.getElementById("guardarBorradorCoaching").addEventListener("click", function () {
        sincronizarDetalleCoaching();
        window.alert("El borrador de Coaching está listo para guardarse en el backend.");
    });

    let validacionEnCurso = false;

    formularioCoaching.addEventListener("invalid", function (evento) {
        if (validacionEnCurso) {
            return;
        }

        validacionEnCurso = true;
        const seccionInvalida = evento.target.closest("details");

        if (seccionInvalida) {
            seccionInvalida.open = true;
        }

        window.setTimeout(function () {
            validacionEnCurso = false;
        }, 0);
    }, true);

    formularioCoaching.addEventListener("submit", function (evento) {
        evento.preventDefault();
        sincronizarDetalleCoaching();

        if (!formularioCoaching.checkValidity()) {
            const primerCampoInvalido = formularioCoaching.querySelector(":invalid");
            const seccionInvalida = primerCampoInvalido.closest("details");

            if (seccionInvalida) {
                seccionInvalida.open = true;
            }

            primerCampoInvalido.focus();
            primerCampoInvalido.reportValidity();
            return;
        }

        window.alert("La sesión de Coaching GROW está lista para enviarse al backend.");
    });
});
