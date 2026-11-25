function rutasDeSesion(sesion) {
    const tipos = {
        coaching: { nombre: "Coaching", formulario: "formulario-coaching.html", detalle: "detalle-coaching.html" },
        itgf: { nombre: "ITGF", formulario: "formulario-itgf.html", detalle: "detalle-itgf.html" },
        accountability: { nombre: "Accountability", formulario: "formulario-correctivo.html", detalle: "detalle-correctivo.html" },
        "verbal-warning": { nombre: "Verbal Warning", formulario: "formulario-correctivo.html", detalle: "detalle-correctivo.html" }
    };
    const clase = sesion.clase || Object.keys(tipos).find(clave => tipos[clave].nombre === sesion.tipo);
    if (!Object.hasOwn(tipos, clase)) return null;
    const tipo = tipos[clase];
    const agente = encodeURIComponent(sesion.agenteId);
    const id = encodeURIComponent(sesion.sesionId ?? sesion.id);
    return {
        continuar: `${tipo.formulario}?agente=${agente}&tipo=${encodeURIComponent(tipo.nombre)}&borrador=${id}`,
        detalle: `${tipo.detalle}?agente=${agente}&sesion=${id}` +
            (["accountability", "verbal-warning"].includes(clase) ? `&tipo=${encodeURIComponent(tipo.nombre)}` : "")
    };
}
