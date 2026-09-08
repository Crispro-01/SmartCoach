export function comprobarEstado(solicitud, respuesta) {
    respuesta.json({
        estado: "ok",
        mensaje: "API de Smart Coach funcionando"
    });
}
