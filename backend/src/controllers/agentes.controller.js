import { usuarios } from "../data/usuarios.data.js";
import { sesiones } from "../data/sesiones.data.js";

function construirAgente(usuario) {
    return {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        supervisorId: usuario.supervisorId,
        sesiones: sesiones.filter(function (sesion) {
            return sesion.agenteId === usuario.id;
        })
    };
}

export function listarAgentes(solicitud, respuesta) {
    const supervisorId = solicitud.query.supervisorId;
    let agentes = usuarios.filter(function (usuario) {
        return usuario.rol === "Agente";
    });

    if (supervisorId) {
        agentes = agentes.filter(function (agente) {
            return agente.supervisorId === supervisorId;
        });
    }

    const datos = agentes.map(construirAgente);

    respuesta.json({
        total: datos.length,
        datos
    });
}

export function obtenerAgentePorId(solicitud, respuesta) {
    const agenteId = solicitud.params.id;
    const usuario = usuarios.find(function (usuarioActual) {
        return usuarioActual.id === agenteId && usuarioActual.rol === "Agente";
    });

    if (!usuario) {
        return respuesta.status(404).json({
            estado: "error",
            mensaje: "Agente no encontrado"
        });
    }

    respuesta.json({
        estado: "ok",
        datos: construirAgente(usuario)
    });
}
