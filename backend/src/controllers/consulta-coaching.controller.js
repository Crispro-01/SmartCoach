import { pool } from "../config/database.js";

// La consulta solo lee sesiones de Coaching completadas; los borradores usan otra ruta.
export async function consultarSesionCoaching(solicitud, respuesta) {
    const id = Number(solicitud.params.id);
    const agenteId = solicitud.query.agenteId;
    if (!Number.isSafeInteger(id) || id < 1 || typeof agenteId !== "string" || !agenteId.trim()) {
        return respuesta.status(400).json({ estado: "error", mensaje: "Indica una sesión y un agente válidos." });
    }

    let conexion;
    try {
        conexion = await pool.getConnection();
        const esManager = solicitud.usuario.rol === "Manager";
        const campoResponsable = esManager ? "c.supervisor_id" : "s.coach_id";
        const filtroArchivo = esManager ? "" :
            " AND NOT EXISTS (SELECT 1 FROM solicitudes_eliminacion_sesion q " +
            "WHERE q.sesion_id = s.sesion_id AND q.estado = 'APROBADA')";
        const [sesiones] = await conexion.execute(
            "SELECT s.sesion_id AS id, s.agente_id AS agenteId, a.nombre AS agenteNombre, " +
            "s.coach_id AS coachId, c.nombre AS coachNombre, s.tema, " +
            "DATE_FORMAT(s.fecha_creacion, '%d/%m/%Y %H:%i') AS fechaCreacion, " +
            "DATE_FORMAT(s.fecha_completada, '%d/%m/%Y %H:%i') AS fechaCompletada, " +
            "s.duracion_segundos AS duracionSegundos " +
            "FROM sesiones s JOIN usuarios a ON a.employee_id = s.agente_id " +
            "JOIN usuarios c ON c.employee_id = s.coach_id " +
            "JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
            "JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
            `WHERE s.sesion_id = ? AND s.agente_id = ? AND ${campoResponsable} = ? ` +
            "AND t.codigo = 'COACHING' AND e.codigo = 'COMPLETADA'" + filtroArchivo,
            [id, agenteId.trim(), solicitud.usuario.employeeId]
        );
        if (!sesiones.length) {
            return respuesta.status(404).json({ estado: "error", mensaje: "No se encontró una sesión de Coaching completada para este agente." });
        }

        const [detalles] = await conexion.execute(
            "SELECT d.apertura_comportamiento AS apertura, ts.nombre AS tipoSeguimiento, " +
            "d.numero_sesion AS numeroSesion, b.nombre AS comportamientoTrabajado, " +
            "d.comportamiento_realizado AS comportamientoRealizado " +
            "FROM coaching_detalles d JOIN tipos_seguimiento ts ON ts.tipo_seguimiento_id = d.tipo_seguimiento_id " +
            "JOIN comportamientos b ON b.comportamiento_id = d.comportamiento_trabajado_id WHERE d.sesion_id = ?",
            [id]
        );
        const [llamadas] = await conexion.execute(
            "SELECT l.llamada_id AS id, l.numero_llamada AS numero, l.contact_id AS contactId, " +
            "cd.nombre AS callDriver, l.resumen, l.hubo_resolucion AS resolucion " +
            "FROM coaching_llamadas l JOIN call_drivers cd ON cd.call_driver_id = l.call_driver_id " +
            "WHERE l.sesion_id = ? ORDER BY l.numero_llamada",
            [id]
        );
        const [evaluaciones] = await conexion.execute(
            "SELECT ev.llamada_id AS llamadaId, b.nombre AS comportamiento, ev.cumplio, " +
            "b.orden FROM coaching_evaluaciones_llamada ev " +
            "JOIN coaching_llamadas l ON l.llamada_id = ev.llamada_id " +
            "JOIN comportamientos b ON b.comportamiento_id = ev.comportamiento_id " +
            "WHERE l.sesion_id = ? ORDER BY l.numero_llamada, b.orden",
            [id]
        );
        const [resultados] = await conexion.execute(
            "SELECT b.nombre AS comportamiento, r.cumplio_final AS cumplioFinal " +
            "FROM coaching_resultados_comportamiento r " +
            "JOIN comportamientos b ON b.comportamiento_id = r.comportamiento_id " +
            "WHERE r.sesion_id = ? ORDER BY b.orden",
            [id]
        );
        const [kpis] = await conexion.execute(
            "SELECT k.nombre AS nombre, ck.resultado_mtd AS resultadoMtd, " +
            "ck.meta_coaching_anterior AS metaAnterior, ck.resultado_actual AS resultadoActual, " +
            "ck.hubo_mejora AS huboMejora, ck.meta_siguiente_semana AS metaSiguiente " +
            "FROM coaching_kpis ck JOIN kpis k ON k.kpi_id = ck.kpi_id WHERE ck.sesion_id = ?",
            [id]
        );
        const [compromisos] = await conexion.execute(
            "SELECT coach_que AS coachQue, coach_como AS coachComo, coach_cuando AS coachCuando, " +
            "coach_reconocimiento AS coachReconocimiento, agente_que AS agenteQue, " +
            "agente_como AS agenteComo, agente_cuando AS agenteCuando, " +
            "agente_evaluacion AS agenteEvaluacion, agente_reconocimiento AS agenteReconocimiento " +
            "FROM coaching_compromisos WHERE sesion_id = ?",
            [id]
        );
        const [raices] = await conexion.execute(
            "SELECT actividad_toolkit AS actividadToolkit, cierre_comportamiento AS cierreComportamiento, " +
            "llamadas_con_comportamiento AS llamadasConComportamiento, " +
            "tendencia_tres_semanas AS tendenciaTresSemanas, motivo_no_realizo AS motivoNoRealizo, " +
            "actividad_superar_obstaculo AS actividadSuperarObstaculo, motivo_continuar AS motivoContinuar, " +
            "resultado_roleplay AS resultadoRoleplay, attainment_actual AS attainmentActual, " +
            "cambio_kpi AS cambioKpi, cambio_comportamiento AS cambioComportamiento " +
            "FROM coaching_rca WHERE sesion_id = ?",
            [id]
        );
        const [solicitudes] = await conexion.execute(
            "SELECT solicitud_id AS id, motivo, estado, " +
            "DATE_FORMAT(fecha_solicitud, '%d/%m/%Y %H:%i') AS fechaSolicitud, " +
            "DATE_FORMAT(fecha_resolucion, '%d/%m/%Y %H:%i') AS fechaResolucion, " +
            "respuesta_revision AS respuestaRevision " +
            "FROM solicitudes_eliminacion_sesion WHERE sesion_id = ? " +
            "ORDER BY solicitud_id DESC LIMIT 1",
            [id]
        );

        const evaluacionesPorLlamada = new Map();
        for (const evaluacion of evaluaciones) {
            const lista = evaluacionesPorLlamada.get(evaluacion.llamadaId) || [];
            lista.push({ comportamiento: evaluacion.comportamiento, cumplio: Boolean(evaluacion.cumplio) });
            evaluacionesPorLlamada.set(evaluacion.llamadaId, lista);
        }
        return respuesta.json({
            estado: "ok",
            datos: {
                sesion: sesiones[0],
                detalles: detalles[0] || null,
                llamadas: llamadas.map(function (llamada) {
                    return { ...llamada, resolucion: Boolean(llamada.resolucion), evaluaciones: evaluacionesPorLlamada.get(llamada.id) || [] };
                }),
                resultados: resultados.map(function (fila) { return { ...fila, cumplioFinal: Boolean(fila.cumplioFinal) }; }),
                kpi: kpis[0] || null,
                compromisos: compromisos[0] || null,
                rca: raices[0] || null,
                solicitudEliminacion: solicitudes[0] || null
            }
        });
    } catch (error) {
        console.error("Error al consultar la sesión de Coaching:", error.message);
        return respuesta.status(500).json({ estado: "error", mensaje: "No se pudo consultar la sesión de Coaching." });
    } finally {
        if (conexion) conexion.release();
    }
}
