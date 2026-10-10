import { pool } from "../config/database.js";

class ErrorSolicitud extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function texto(valor, campo, maximo) {
    if (typeof valor !== "string") throw new ErrorSolicitud("El campo \"" + campo + "\" es obligatorio.");
    const limpio = valor.trim();
    if (!limpio || limpio.length > maximo) throw new ErrorSolicitud("Revisa el campo \"" + campo + "\".");
    return limpio;
}

function entero(valor, campo, minimo = 1, maximo = 65535) {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
        throw new ErrorSolicitud("El valor de \"" + campo + "\" no es válido.");
    }
    return numero;
}

function decimal(valor, campo) {
    const cadena = String(valor ?? "").trim();
    if (!/^-?\d+(?:\.\d{1,4})?$/.test(cadena) || Math.abs(Number(cadena)) >= 100000000) {
        throw new ErrorSolicitud("El valor de \"" + campo + "\" debe ser numérico (máximo 4 decimales).");
    }
    return Number(cadena);
}

function booleano(valor, campo) {
    if (typeof valor !== "boolean") throw new ErrorSolicitud("El campo \"" + campo + "\" debe ser Sí o No.");
    return valor;
}

function marcadores(cantidad, columnas) {
    return Array.from({ length: cantidad }, function () {
        return "(" + Array(columnas).fill("?").join(", ") + ")";
    }).join(", ");
}

async function consultarAgenteAsignado(conexion, agenteId) {
    const [agentes] = await conexion.execute(
        "SELECT a.employee_id AS agenteId, c.employee_id AS coachId " +
        "FROM usuarios a INNER JOIN roles ra ON ra.rol_id = a.rol_id " +
        "INNER JOIN usuarios c ON c.employee_id = a.supervisor_id " +
        "INNER JOIN roles rc ON rc.rol_id = c.rol_id " +
        "WHERE a.employee_id = ? AND a.activo = TRUE AND ra.nombre = 'Agente' " +
        "AND c.activo = TRUE AND rc.nombre = 'Coach'",
        [texto(agenteId, "agente", 32)]
    );
    if (!agentes.length) {
        throw new ErrorSolicitud("El agente no está activo o no tiene un Coach asignado.", 404);
    }
    return agentes[0];
}

async function consultarBorrador(conexion, id, agente, bloquear = false) {
    const [filas] = await conexion.execute(
        "SELECT s.sesion_id AS id, s.borrador_json AS contenido, e.codigo AS estado " +
        "FROM sesiones s INNER JOIN tipos_sesion t ON t.tipo_sesion_id = s.tipo_sesion_id " +
        "INNER JOIN estados_sesion e ON e.estado_sesion_id = s.estado_sesion_id " +
        "WHERE s.sesion_id = ? AND s.agente_id = ? AND s.coach_id = ? AND t.codigo = 'COACHING'" +
        (bloquear ? " FOR UPDATE" : ""),
        [entero(id, "borrador", 1, Number.MAX_SAFE_INTEGER), agente.agenteId, agente.coachId]
    );
    if (!filas.length) throw new ErrorSolicitud("No se encontró el borrador de Coaching.", 404);
    if (filas[0].estado !== "BORRADOR") {
        throw new ErrorSolicitud("Esta sesión ya no es un borrador y no se puede editar.", 409);
    }
    return filas[0];
}

function contenidoBorrador(cuerpo) {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        throw new ErrorSolicitud("El contenido del borrador no es válido.");
    }
    texto(cuerpo.agentId, "agente", 32);
    const contenido = JSON.stringify(cuerpo);
    if (Buffer.byteLength(contenido, "utf8") > 90000) {
        throw new ErrorSolicitud("El borrador supera el tamaño permitido.");
    }
    return contenido;
}

function responderError(respuesta, error, accion) {
    console.error(`Error al ${accion} el borrador de Coaching:`, error.message);
    return respuesta.status(error.status || 500).json({
        estado: "error",
        mensaje: error.status ? error.message : "No se pudo gestionar el borrador de Coaching."
    });
}

export async function crearBorradorCoaching(solicitud, respuesta) {
    let conexion;
    try {
        const contenido = contenidoBorrador(solicitud.body);
        conexion = await pool.getConnection();
        const agente = await consultarAgenteAsignado(conexion, solicitud.body.agentId);
        const [tipos] = await conexion.execute("SELECT tipo_sesion_id FROM tipos_sesion WHERE codigo = 'COACHING'");
        const [estados] = await conexion.execute("SELECT estado_sesion_id FROM estados_sesion WHERE codigo = 'BORRADOR'");
        if (!tipos.length || !estados.length) throw new ErrorSolicitud("Faltan catálogos base para guardar el borrador.", 500);

        const [sesion] = await conexion.execute(
            "INSERT INTO sesiones (agente_id, coach_id, tipo_sesion_id, estado_sesion_id, tema, borrador_json) " +
            "VALUES (?, ?, ?, ?, 'Coaching GROW (borrador)', ?)",
            [agente.agenteId, agente.coachId, tipos[0].tipo_sesion_id, estados[0].estado_sesion_id, contenido]
        );
        return respuesta.status(201).json({ estado: "ok", datos: { sesionId: String(sesion.insertId) } });
    } catch (error) {
        return responderError(respuesta, error, "crear");
    } finally {
        if (conexion) conexion.release();
    }
}

export async function obtenerBorradorCoaching(solicitud, respuesta) {
    let conexion;
    try {
        conexion = await pool.getConnection();
        const agente = await consultarAgenteAsignado(conexion, solicitud.query.agenteId);
        const borrador = await consultarBorrador(conexion, solicitud.params.id, agente);
        return respuesta.json({
            estado: "ok",
            datos: {
                sesionId: String(borrador.id),
                contenido: typeof borrador.contenido === "string" ? JSON.parse(borrador.contenido) : borrador.contenido
            }
        });
    } catch (error) {
        return responderError(respuesta, error, "consultar");
    } finally {
        if (conexion) conexion.release();
    }
}

export async function actualizarBorradorCoaching(solicitud, respuesta) {
    let conexion;
    let iniciada = false;
    try {
        const contenido = contenidoBorrador(solicitud.body);
        conexion = await pool.getConnection();
        await conexion.beginTransaction();
        iniciada = true;
        const agente = await consultarAgenteAsignado(conexion, solicitud.body.agentId);
        const borrador = await consultarBorrador(conexion, solicitud.params.id, agente, true);
        await conexion.execute("UPDATE sesiones SET borrador_json = ? WHERE sesion_id = ?", [contenido, borrador.id]);
        await conexion.commit();
        iniciada = false;
        return respuesta.json({ estado: "ok", datos: { sesionId: String(borrador.id) } });
    } catch (error) {
        if (iniciada && conexion) {
            try { await conexion.rollback(); } catch (errorRollback) {
                console.error("No se pudo revertir el borrador:", errorRollback.message);
            }
        }
        return responderError(respuesta, error, "actualizar");
    } finally {
        if (conexion) conexion.release();
    }
}

function normalizar(cuerpo, catalogos) {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        throw new ErrorSolicitud("El contenido de la sesión no es válido.");
    }
    const apertura = booleano(cuerpo.opening, "apertura del comportamiento");
    const tipoSeguimientoId = entero(cuerpo.followUpTypeId, "tipo de seguimiento", 1, 255);
    const numeroSesion = entero(cuerpo.sessionNumber, "número de sesión");
    const comportamientoTrabajadoId = entero(cuerpo.behaviorWorkedId, "comportamiento trabajado");
    if (!catalogos.tiposSeguimiento.has(tipoSeguimientoId)) throw new ErrorSolicitud("El tipo de seguimiento no está disponible.");
    if (apertura && catalogos.nombreSeguimiento.get(tipoSeguimientoId) !== "Constructivo") {
        throw new ErrorSolicitud("Una sesión de apertura debe usar el tipo Constructivo.");
    }
    if (apertura && numeroSesion !== 1) throw new ErrorSolicitud("Una sesión de apertura debe ser la número 1.");
    if (!catalogos.comportamientos.has(comportamientoTrabajadoId)) {
        throw new ErrorSolicitud("El comportamiento trabajado no está disponible.");
    }
    if (!Array.isArray(cuerpo.calls) || cuerpo.calls.length !== 2) {
        throw new ErrorSolicitud("La sesión debe incluir exactamente dos llamadas.");
    }

    const llamadas = cuerpo.calls.map(function (llamada, indice) {
        const numero = indice + 1;
        if (Number(llamada.number) !== numero) throw new ErrorSolicitud("Las llamadas deben ser la número 1 y la número 2.");
        const callDriverId = entero(llamada.callDriverId, "Call Driver de llamada " + numero);
        if (!catalogos.callDrivers.has(callDriverId)) throw new ErrorSolicitud("El Call Driver de la llamada " + numero + " no está disponible.");
        if (!Array.isArray(llamada.evaluations) || llamada.evaluations.length !== catalogos.comportamientos.size) {
            throw new ErrorSolicitud("Completa los comportamientos en cada llamada.");
        }
        const evaluaciones = new Map();
        for (const evaluacion of llamada.evaluations) {
            const id = entero(evaluacion.behaviorId, "comportamiento");
            if (!catalogos.comportamientos.has(id) || evaluaciones.has(id)) {
                throw new ErrorSolicitud("La evaluación contiene un comportamiento inválido o repetido.");
            }
            evaluaciones.set(id, booleano(evaluacion.fulfilled, "evaluación"));
        }
        if (evaluaciones.size !== catalogos.comportamientos.size) {
            throw new ErrorSolicitud("Completa todos los comportamientos de ambas llamadas.");
        }
        return {
            numero,
            contactId: texto(llamada.contactId, "Contact ID de llamada " + numero, 80),
            callDriverId,
            resumen: texto(llamada.summary, "resumen de llamada " + numero, 5000),
            resolucion: booleano(llamada.resolved, "resolución"),
            evaluaciones
        };
    });

    const kpi = cuerpo.kpi || {};
    const kpiId = entero(kpi.kpiId, "KPI", 1, 255);
    if (!catalogos.kpis.has(kpiId)) throw new ErrorSolicitud("El KPI no está disponible.");
    const metaAnterior = apertura ? null : decimal(kpi.previousGoal, "meta anterior");
    const compromisos = cuerpo.commitments || {};
    const coach = compromisos.coach || {};
    const agente = compromisos.agent || {};
    const rca = cuerpo.rca || {};

    return {
        agenteId: texto(cuerpo.agentId, "agente", 32),
        apertura, tipoSeguimientoId, numeroSesion, comportamientoTrabajadoId, llamadas,
        kpi: {
            id: kpiId,
            mtd: decimal(kpi.resultMtd, "resultado MTD"),
            metaAnterior,
            actual: decimal(kpi.currentResult, "resultado actual"),
            siguiente: decimal(kpi.nextGoal, "meta siguiente")
        },
        compromisos: [
            texto(coach.what, "compromiso del Coach: qué", 5000),
            texto(coach.how, "compromiso del Coach: cómo", 5000),
            texto(coach.when, "compromiso del Coach: cuándo", 5000),
            texto(coach.recognition, "reconocimiento del Coach", 5000),
            texto(agente.what, "compromiso del agente: qué", 5000),
            texto(agente.how, "compromiso del agente: cómo", 5000),
            texto(agente.when, "compromiso del agente: cuándo", 5000),
            texto(agente.evaluation, "evaluación del agente", 5000),
            texto(agente.recognition, "reconocimiento del agente", 5000)
        ],
        rca: [
            texto(rca.activity, "actividad del Toolkit", 180),
            booleano(rca.closingBehavior, "cierre del comportamiento"),
            texto(rca.callsWithBehavior, "llamadas con comportamiento", 100),
            texto(rca.trendLast3Weeks, "tendencia de tres semanas", 180),
            texto(rca.reasonNotPerformed, "motivo por el que no se realizó", 5000),
            texto(rca.activityToOvercome, "actividad para superar el obstáculo", 5000),
            texto(rca.whyContinue, "motivo para continuar", 5000),
            texto(rca.roleplayResult, "resultado del roleplay", 5000),
            texto(rca.currentAttainment, "attainment actual", 120),
            texto(rca.kpiChange, "cambio de KPI", 5000),
            texto(rca.behaviorChange, "cambio de comportamiento", 5000)
        ],
        duracion: cuerpo.durationSeconds === null || cuerpo.durationSeconds === ""
            ? null : entero(cuerpo.durationSeconds, "duración", 0, 4294967295)
    };
}

export async function crearSesionCoaching(solicitud, respuesta) {
    let conexion;
    let iniciada = false;
    try {
        conexion = await pool.getConnection();
        await conexion.beginTransaction();
        iniciada = true;

        const agente = await consultarAgenteAsignado(conexion, solicitud.body?.agentId);

        const [behaviors] = await conexion.execute("SELECT comportamiento_id FROM comportamientos WHERE activo = TRUE");
        const [drivers] = await conexion.execute("SELECT call_driver_id FROM call_drivers WHERE activo = TRUE");
        const [kpis] = await conexion.execute("SELECT kpi_id FROM kpis WHERE activo = TRUE");
        const [seguimientos] = await conexion.execute("SELECT tipo_seguimiento_id, nombre FROM tipos_seguimiento");
        const [tipos] = await conexion.execute("SELECT tipo_sesion_id FROM tipos_sesion WHERE codigo = 'COACHING'");
        const [estados] = await conexion.execute("SELECT estado_sesion_id FROM estados_sesion WHERE codigo = 'COMPLETADA'");

        const catalogos = {
            comportamientos: new Set(behaviors.map(function (fila) { return Number(fila.comportamiento_id); })),
            callDrivers: new Set(drivers.map(function (fila) { return Number(fila.call_driver_id); })),
            kpis: new Set(kpis.map(function (fila) { return Number(fila.kpi_id); })),
            tiposSeguimiento: new Set(seguimientos.map(function (fila) { return Number(fila.tipo_seguimiento_id); })),
            nombreSeguimiento: new Map(seguimientos.map(function (fila) {
                return [Number(fila.tipo_seguimiento_id), fila.nombre];
            }))
        };
        const datos = normalizar(solicitud.body, catalogos);
        if (!tipos.length || !estados.length) {
            throw new ErrorSolicitud("Faltan catálogos base para crear la sesión.", 500);
        }

        let sesionId;
        if (solicitud.body.draftId !== undefined && solicitud.body.draftId !== null) {
            const borrador = await consultarBorrador(conexion, solicitud.body.draftId, agente, true);
            sesionId = borrador.id;
            await conexion.execute(
                "UPDATE sesiones SET estado_sesion_id = ?, tema = 'Coaching GROW', " +
                "duracion_segundos = ?, fecha_completada = CURRENT_TIMESTAMP, borrador_json = NULL WHERE sesion_id = ?",
                [estados[0].estado_sesion_id, datos.duracion, sesionId]
            );
        } else {
            const [sesion] = await conexion.execute(
                "INSERT INTO sesiones (agente_id, coach_id, tipo_sesion_id, estado_sesion_id, tema, duracion_segundos, fecha_completada) " +
                "VALUES (?, ?, ?, ?, 'Coaching GROW', ?, CURRENT_TIMESTAMP)",
                [agente.agenteId, agente.coachId, tipos[0].tipo_sesion_id, estados[0].estado_sesion_id, datos.duracion]
            );
            sesionId = sesion.insertId;
        }
        const finales = new Map();
        for (const id of catalogos.comportamientos) {
            finales.set(id, datos.llamadas.every(function (llamada) {
                return llamada.evaluaciones.get(id) === true;
            }));
        }

        await conexion.execute(
            "INSERT INTO coaching_detalles (sesion_id, apertura_comportamiento, tipo_seguimiento_id, numero_sesion, comportamiento_trabajado_id, comportamiento_realizado) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            [sesionId, datos.apertura, datos.tipoSeguimientoId, datos.numeroSesion, datos.comportamientoTrabajadoId, finales.get(datos.comportamientoTrabajadoId)]
        );

        const llamadasGuardadas = [];
        for (const llamada of datos.llamadas) {
            const [guardada] = await conexion.execute(
                "INSERT INTO coaching_llamadas (sesion_id, numero_llamada, contact_id, call_driver_id, resumen, hubo_resolucion) VALUES (?, ?, ?, ?, ?, ?)",
                [sesionId, llamada.numero, llamada.contactId, llamada.callDriverId, llamada.resumen, llamada.resolucion]
            );
            llamadasGuardadas.push({ id: guardada.insertId, evaluaciones: llamada.evaluaciones });
        }

        const evaluaciones = llamadasGuardadas.flatMap(function (llamada) {
            return Array.from(llamada.evaluaciones.entries()).map(function (fila) {
                return [llamada.id, fila[0], fila[1]];
            });
        });
        await conexion.execute(
            "INSERT INTO coaching_evaluaciones_llamada (llamada_id, comportamiento_id, cumplio) VALUES " +
            marcadores(evaluaciones.length, 3),
            evaluaciones.flat()
        );

        const resultados = Array.from(finales.entries()).map(function (fila) {
            return [sesionId, fila[0], fila[1]];
        });
        await conexion.execute(
            "INSERT INTO coaching_resultados_comportamiento (sesion_id, comportamiento_id, cumplio_final) VALUES " +
            marcadores(resultados.length, 3),
            resultados.flat()
        );

        const mejora = datos.apertura ? null : datos.kpi.actual >= datos.kpi.metaAnterior;
        await conexion.execute(
            "INSERT INTO coaching_kpis (sesion_id, kpi_id, resultado_mtd, meta_coaching_anterior, resultado_actual, hubo_mejora, meta_siguiente_semana) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [sesionId, datos.kpi.id, datos.kpi.mtd, datos.kpi.metaAnterior, datos.kpi.actual, mejora, datos.kpi.siguiente]
        );
        await conexion.execute(
            "INSERT INTO coaching_compromisos (sesion_id, coach_que, coach_como, coach_cuando, coach_reconocimiento, agente_que, agente_como, agente_cuando, agente_evaluacion, agente_reconocimiento) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [sesionId, ...datos.compromisos]
        );
        await conexion.execute(
            "INSERT INTO coaching_rca (sesion_id, actividad_toolkit, cierre_comportamiento, llamadas_con_comportamiento, tendencia_tres_semanas, motivo_no_realizo, actividad_superar_obstaculo, motivo_continuar, resultado_roleplay, attainment_actual, cambio_kpi, cambio_comportamiento) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [sesionId, ...datos.rca]
        );

        await conexion.commit();
        iniciada = false;
        return respuesta.status(201).json({
            estado: "ok",
            mensaje: "La sesión de Coaching se guardó y completó correctamente.",
            datos: { sesionId: String(sesionId) }
        });
    } catch (error) {
        if (iniciada && conexion) {
            try { await conexion.rollback(); } catch (errorRollback) {
                console.error("No se pudo revertir la transacción:", errorRollback.message);
            }
        }
        console.error("Error al guardar la sesión de Coaching:", error.message);
        return respuesta.status(error.status || 500).json({
            estado: "error",
            mensaje: error.status ? error.message : "No se pudo guardar la sesión de Coaching."
        });
    } finally {
        if (conexion) conexion.release();
    }
}
