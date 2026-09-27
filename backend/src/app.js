import express from "express";
import { configuracion } from "./config/env.js";
import rutasEstado from "./routes/estado.routes.js";
import rutasAgentes from "./routes/agentes.routes.js";
import rutasCatalogos from "./routes/catalogos.routes.js";
import rutasCoaching from "./routes/coaching.routes.js";

const app = express();

// Permite que el frontend servido localmente consulte esta API durante el desarrollo.
app.use(function (solicitud, respuesta, siguiente) {
    const origen = solicitud.get("origin") ?? "";
    const origenLocal = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origen);

    if (origenLocal) {
        respuesta.setHeader("Access-Control-Allow-Origin", origen);
        respuesta.setHeader("Vary", "Origin");
        respuesta.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        respuesta.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (solicitud.method === "OPTIONS") {
        return respuesta.sendStatus(origenLocal ? 204 : 403);
    }

    return siguiente();
});

app.use(express.json());
app.use("/api/estado", rutasEstado);
app.use("/api/agentes", rutasAgentes);
app.use("/api/catalogos", rutasCatalogos);
app.use("/api/sesiones", rutasCoaching);

app.listen(configuracion.puerto, function () {
    console.log(`Servidor de Smart Coach disponible en http://localhost:${configuracion.puerto}`);
});
