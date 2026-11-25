const esRevision = new URLSearchParams(window.location.search).get("revision") === "1";
const URL_API_SESION = esRevision
    ? "/api/revision/sesiones/coaching" : "/api/sesiones/coaching";

function mostrarSesion(datos) {
    const destino = document.getElementById("contenidoSesion");
    const { sesion, detalles, llamadas, resultados, kpi, compromisos, rca, solicitudEliminacion } = datos;
    destino.replaceChildren();
    document.title = "Smart Coach - Detalle de Coaching";

    seccion("Datos de la sesión", [
        ["Agente", `${sesion.agenteNombre} (${sesion.agenteId})`],
        ["Coach", `${sesion.coachNombre} (${sesion.coachId})`],
        ["Tema", sesion.tema],
        ["Creada", sesion.fechaCreacion],
        ["Completada", sesion.fechaCompletada],
        ["Duración", sesion.duracionSegundos === null ? null : `${sesion.duracionSegundos} segundos`]
    ], destino);

    if (detalles) seccion("Seguimiento del comportamiento", [
        ["Apertura del comportamiento", siNo(detalles.apertura)],
        ["Tipo de seguimiento", detalles.tipoSeguimiento],
        ["Número de sesión", detalles.numeroSesion],
        ["Comportamiento trabajado", detalles.comportamientoTrabajado],
        ["Comportamiento realizado", siNo(detalles.comportamientoRealizado)]
    ], destino);

    for (const llamada of llamadas) {
        seccion(`Llamada ${llamada.numero}`, [
            ["Contact ID", llamada.contactId],
            ["Call Driver", llamada.callDriver],
            ["Resumen", llamada.resumen],
            ["Hubo resolución", siNo(llamada.resolucion)]
        ], destino);
        tablaEvaluaciones(`Evaluación de la llamada ${llamada.numero}`, llamada.evaluaciones, destino, "cumplio");
    }
    tablaEvaluaciones("Resultado final de comportamientos", resultados, destino, "cumplioFinal");

    if (kpi) seccion("KPI", [
        ["Indicador", kpi.nombre], ["Resultado MTD", kpi.resultadoMtd],
        ["Meta del coaching anterior", kpi.metaAnterior], ["Resultado actual", kpi.resultadoActual],
        ["Hubo mejora", siNo(kpi.huboMejora)], ["Meta para la siguiente semana", kpi.metaSiguiente]
    ], destino);

    if (compromisos) seccion("Compromisos del Coach", [
        ["Qué", compromisos.coachQue], ["Cómo", compromisos.coachComo],
        ["Cuándo", compromisos.coachCuando], ["Reconocimiento", compromisos.coachReconocimiento]
    ], destino);
    if (compromisos) seccion("Compromisos del agente", [
        ["Qué", compromisos.agenteQue], ["Cómo", compromisos.agenteComo],
        ["Cuándo", compromisos.agenteCuando], ["Evaluación", compromisos.agenteEvaluacion],
        ["Reconocimiento", compromisos.agenteReconocimiento]
    ], destino);

    if (rca) seccion("Análisis y cierre (RCA)", [
        ["Actividad del Toolkit", rca.actividadToolkit],
        ["Cierre del comportamiento", siNo(rca.cierreComportamiento)],
        ["Llamadas con comportamiento", rca.llamadasConComportamiento],
        ["Tendencia de tres semanas", rca.tendenciaTresSemanas],
        ["Motivo por el que no se realizó", rca.motivoNoRealizo],
        ["Actividad para superar el obstáculo", rca.actividadSuperarObstaculo],
        ["Motivo para continuar", rca.motivoContinuar],
        ["Resultado del roleplay", rca.resultadoRoleplay],
        ["Attainment actual", rca.attainmentActual],
        ["Cambio en KPI", rca.cambioKpi],
        ["Cambio en comportamiento", rca.cambioComportamiento]
    ], destino);

    mostrarSolicitudEliminacion(sesion.id, solicitudEliminacion, destino);

    document.getElementById("estadoConsulta").hidden = true;
    destino.hidden = false;
}

async function cargarSesion() {
    const parametros = new URLSearchParams(window.location.search);
    const agenteId = parametros.get("agente");
    const sesionId = parametros.get("sesion");
    const estado = document.getElementById("estadoConsulta");
    if (!agenteId || !/^\d+$/.test(sesionId || "")) {
        estado.textContent = "Falta identificar el agente o la sesión.";
        return;
    }
    const volver = document.getElementById("volverAgente");
    if (esRevision) {
        volver.href = "revision-solicitudes.html";
        volver.textContent = "← Volver a solicitudes";
        document.querySelector(".usuario-dashboard span").textContent = "Manager";
    } else {
        volver.href = `detalle-agente.html?id=${encodeURIComponent(agenteId)}`;
    }
    try {
        const respuesta = await fetch(`${URL_API_SESION}/${encodeURIComponent(sesionId)}?agenteId=${encodeURIComponent(agenteId)}`);
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo cargar la sesión.");
        mostrarSesion(resultado.datos);
    } catch (error) {
        estado.textContent = error.message;
    }
}

document.addEventListener("DOMContentLoaded", cargarSesion);
