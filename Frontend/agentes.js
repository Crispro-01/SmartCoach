const URL_API_AGENTES = "http://localhost:3000/api/agentes";
const COACH_DEMO_ID = "COACH001";

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto || "—";
    return celda;
}

function crearEtiquetaTipo(sesion) {
    const etiqueta = document.createElement("span");
    const clasesPermitidas = ["coaching", "itgf", "accountability", "verbal-warning"];

    etiqueta.classList.add("tipo-sesion");
    if (clasesPermitidas.includes(sesion.clase)) {
        etiqueta.classList.add(sesion.clase);
    }
    etiqueta.textContent = sesion.tipo || "Sin sesiones";

    return etiqueta;
}

function crearFilaAgente(agente) {
    const fila = document.createElement("tr");
    const ultimaSesion = agente.sesiones[0];
    const celdaTipo = document.createElement("td");
    const celdaAccion = document.createElement("td");
    const enlace = document.createElement("a");

    fila.append(crearCelda(agente.nombre), crearCelda(agente.id));

    if (ultimaSesion) {
        fila.append(crearCelda(ultimaSesion.fecha));
        celdaTipo.append(crearEtiquetaTipo(ultimaSesion));
    } else {
        fila.append(crearCelda("—"));
        celdaTipo.textContent = "Sin sesiones";
    }

    enlace.href = `detalle-agente.html?id=${encodeURIComponent(agente.id)}`;
    enlace.className = "enlace-agente";
    enlace.textContent = "Ver agente";
    celdaAccion.append(enlace);
    fila.append(celdaTipo, celdaAccion);

    return fila;
}

async function cargarAgentes() {
    const lista = document.getElementById("listaAgentes");

    try {
        const url = `${URL_API_AGENTES}?supervisorId=${encodeURIComponent(COACH_DEMO_ID)}`;
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("El servidor no pudo entregar la lista de agentes.");
        }

        const resultado = await respuesta.json();
        lista.replaceChildren();

        if (resultado.datos.length === 0) {
            const fila = document.createElement("tr");
            const celda = crearCelda("No hay agentes asignados a este Coach.");
            celda.colSpan = 5;
            fila.append(celda);
            lista.append(fila);
            return;
        }

        resultado.datos.forEach(function (agente) {
            lista.append(crearFilaAgente(agente));
        });
    } catch (error) {
        console.error("No se pudo cargar la lista de agentes:", error);
        lista.replaceChildren();
        const fila = document.createElement("tr");
        const celda = crearCelda("No se pudo conectar con el servidor. Verifica que el backend esté iniciado.");
        celda.colSpan = 5;
        fila.append(celda);
        lista.append(fila);
    }
}

document.addEventListener("DOMContentLoaded", cargarAgentes);
