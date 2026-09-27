document.addEventListener("DOMContentLoaded", async function () {
    const agentes = {
        TM001: "Laura Gómez",
        TM002: "Juan Pérez",
        TM003: "Daniela Ruiz",
        TM004: "Andrés Torres",
        TM005: "Camila Rodríguez"
    };

    let comportamientos = [];
    let categoriasCallDriver = [];
    let kpis = [];
    let tiposSeguimiento = [];

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

    try {
        const respuestaCatalogos = await fetch("http://localhost:3000/api/catalogos/coaching");
        const resultadoCatalogos = await respuestaCatalogos.json();

        if (!respuestaCatalogos.ok || resultadoCatalogos.estado !== "ok") {
            throw new Error(resultadoCatalogos.mensaje || "No se pudieron cargar los catálogos.");
        }

        comportamientos = resultadoCatalogos.datos.comportamientos;
        categoriasCallDriver = resultadoCatalogos.datos.categoriasCallDriver;
        kpis = resultadoCatalogos.datos.kpis;
        tiposSeguimiento = resultadoCatalogos.datos.tiposSeguimiento;
    } catch (error) {
        console.error("Error al cargar los catálogos de Coaching:", error.message);
        window.alert("No se pudieron cargar las opciones de Coaching. Verifica que el backend esté iniciado e inténtalo de nuevo.");
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
                opcion.value = callDriver.id.toString();
                opcion.textContent = callDriver.nombre;
                grupo.appendChild(opcion);
            });

            selector.appendChild(grupo);
        });
    }

    cargarCallDrivers(document.getElementById("callDriver1"));
    cargarCallDrivers(document.getElementById("callDriver2"));

    function cargarKpis(selector) {
        kpis.forEach(function (kpi) {
            const opcion = document.createElement("option");
            opcion.value = kpi.id.toString();
            opcion.textContent = kpi.nombre;
            selector.appendChild(opcion);
        });
    }

    cargarKpis(document.getElementById("nombreKpi"));

    function cargarTiposSeguimiento(selector) {
        tiposSeguimiento.forEach(function (tipo) {
            const opcion = document.createElement("option");
            opcion.value = tipo.id.toString();
            opcion.textContent = tipo.nombre;
            selector.appendChild(opcion);
        });
    }

    cargarTiposSeguimiento(document.getElementById("tipoSeguimientoCoaching"));

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
            const tipoConstructivo = tiposSeguimiento.find(function (tipo) {
                return tipo.nombre === "Constructivo";
            });
            tipoSeguimiento.value = tipoConstructivo ? tipoConstructivo.id.toString() : "";
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
        window.alert("El guardado de borradores todavía no está habilitado. No se guardó nada en MySQL; usa Completar sesión cuando el formulario esté listo.");
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

    function construirPayloadCoaching() {
        const obtenerTexto = function (nombre) {
            return formularioCoaching.elements.namedItem(nombre).value.trim();
        };
        const llamadas = [1, 2].map(function (numero) {
            const prefijo = "call" + numero;
            const resolucion = formularioCoaching.querySelector('input[name="resolution' + numero + '"]:checked');
            return {
                number: numero,
                contactId: document.getElementById("contactId" + numero).value.trim(),
                callDriverId: document.getElementById("callDriver" + numero).value,
                summary: document.getElementById("resumenLlamada" + numero).value.trim(),
                resolved: resolucion ? resolucion.value === "Sí" : null,
                evaluations: comportamientos.map(function (comportamiento) {
                    const respuesta = formularioCoaching.querySelector(
                        'input[name="' + prefijo + "_" + comportamiento.clave + '"]:checked'
                    );
                    return {
                        behaviorId: comportamiento.id,
                        fulfilled: respuesta ? respuesta.value === "Sí" : null
                    };
                })
            };
        });
        const comportamientoTrabajado = comportamientos.find(function (comportamiento) {
            return comportamiento.clave === document.getElementById("comportamientoTrabajadoCoaching").value;
        });

        return {
            agentId: obtenerTexto("agenteId"),
            opening: aperturaComportamiento.value === "Sí",
            followUpTypeId: tipoSeguimientoValor.value,
            sessionNumber: numeroSesionValor.value,
            behaviorWorkedId: comportamientoTrabajado ? comportamientoTrabajado.id : "",
            calls: llamadas,
            kpi: {
                kpiId: obtenerTexto("kpiName"),
                resultMtd: obtenerTexto("kpiResultMTD"),
                previousGoal: obtenerTexto("previousCoachingGoal"),
                currentResult: obtenerTexto("kpiCurrentResult"),
                nextGoal: obtenerTexto("kpiGoalNextWeek")
            },
            commitments: {
                coach: {
                    what: obtenerTexto("coachCommitmentWhat"),
                    how: obtenerTexto("coachCommitmentHow"),
                    when: obtenerTexto("coachCommitmentWhen"),
                    recognition: obtenerTexto("coachCommitmentRecognition")
                },
                agent: {
                    what: obtenerTexto("csrCommitmentWhat"),
                    how: obtenerTexto("csrCommitmentHow"),
                    when: obtenerTexto("csrCommitmentWhen"),
                    evaluation: obtenerTexto("csrCommitmentEvaluation"),
                    recognition: obtenerTexto("csrCommitmentRecognition")
                }
            },
            rca: {
                activity: obtenerTexto("rcaActivity"),
                closingBehavior: document.getElementById("cierreComportamiento").checked,
                callsWithBehavior: obtenerTexto("rcaCallsWithBehavior"),
                trendLast3Weeks: obtenerTexto("rcaTrendLast3Weeks"),
                reasonNotPerformed: obtenerTexto("rcaReasonNotPerformed"),
                activityToOvercome: obtenerTexto("rcaActivityToOvercome"),
                whyContinue: obtenerTexto("rcaWhyContinue"),
                roleplayResult: obtenerTexto("rcaRoleplayResult"),
                currentAttainment: obtenerTexto("rcaCurrentAttainment"),
                kpiChange: obtenerTexto("rcaKpiChange"),
                behaviorChange: obtenerTexto("rcaBehaviorChange")
            },
            durationSeconds: duracionCoachingSegundos.value || null
        };
    }

    formularioCoaching.addEventListener("submit", async function (evento) {
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

        if (archivosCoaching.files.length > 0) {
            window.alert("El guardado de adjuntos todavía no está habilitado. Quita los archivos seleccionados antes de completar esta sesión.");
            return;
        }

        const botonCompletar = document.getElementById("completarCoaching");
        botonCompletar.disabled = true;
        botonCompletar.textContent = "Guardando…";

        try {
            const respuesta = await fetch("http://localhost:3000/api/sesiones/coaching", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(construirPayloadCoaching())
            });
            const resultado = await respuesta.json();
            if (!respuesta.ok || resultado.estado !== "ok") {
                throw new Error(resultado.mensaje || "No se pudo guardar la sesión.");
            }

            window.localStorage.removeItem(claveInicioCronometro);
            window.alert("Sesión de Coaching #" + resultado.datos.sesionId + " guardada y completada.");
            window.location.href = "detalle-agente.html?id=" + encodeURIComponent(agenteId);
        } catch (error) {
            console.error("No se pudo guardar la sesión de Coaching:", error);
            window.alert(error.message || "No se pudo guardar la sesión. Verifica que el backend siga iniciado.");
        } finally {
            botonCompletar.disabled = false;
            botonCompletar.textContent = "Completar sesión";
        }
    });
});
