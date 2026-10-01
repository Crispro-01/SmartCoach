import express from "express";
import { configuracion } from "./config/env.js";
import rutasEstado from "./routes/estado.routes.js";
import rutasAgentes from "./routes/agentes.routes.js";
import rutasCatalogos from "./routes/catalogos.routes.js";
import rutasCoaching from "./routes/coaching.routes.js";
import rutasAuth from "./routes/auth.routes.js";
import { exigirAutenticacion, exigirRol } from "./auth/auth.middleware.js";

const app = express();

// Permite que el frontend servido localmente consulte esta API durante el desarrollo.
app.use(function (solicitud, respuesta, siguiente) {
    const origen = solicitud.get("origin") ?? "";
    const origenPermitido = ["http://localhost:5500", "http://127.0.0.1:5500"].includes(origen);

    if (origenPermitido) {
        respuesta.setHeader("Access-Control-Allow-Origin", origen);
        respuesta.setHeader("Vary", "Origin");
        respuesta.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        respuesta.setHeader("Access-Control-Allow-Headers", "Content-Type");
        respuesta.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (solicitud.method === "OPTIONS") {
        return respuesta.sendStatus(origenPermitido ? 204 : 403);
    }

    return siguiente();
});

app.use(express.json());
app.use("/api/estado", rutasEstado);
app.use("/api/auth", rutasAuth);
app.use("/api/agentes", exigirAutenticacion, exigirRol("Coach"), rutasAgentes);
app.use("/api/catalogos", exigirAutenticacion, exigirRol("Coach"), rutasCatalogos);
app.use("/api/sesiones", exigirAutenticacion, exigirRol("Coach"), rutasCoaching);

app.listen(configuracion.puerto, function () {
    console.log(`Servidor de Smart Coach disponible en http://localhost:${configuracion.puerto}`);
});
