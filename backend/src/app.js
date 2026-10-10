import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuracion } from "./config/env.js";
import { exigirCoach } from "./auth/auth.middleware.js";
import rutasAuth from "./routes/auth.routes.js";
import rutasEstado from "./routes/estado.routes.js";
import rutasAgentes from "./routes/agentes.routes.js";
import rutasCatalogos from "./routes/catalogos.routes.js";
import rutasCoaching from "./routes/coaching.routes.js";

const app = express();
app.disable("x-powered-by");
const carpetaFrontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../Frontend");
const origenPermitido = `http://127.0.0.1:${configuracion.puerto}`;

// Las páginas y la API usan el mismo origen local. Esto impide enviar la cookie
// de sesión desde otra página y mantiene las operaciones de escritura dentro de Smart Coach.
app.use(function (solicitud, respuesta, siguiente) {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(solicitud.method) &&
        solicitud.get("origin") !== origenPermitido) {
        return respuesta.status(403).json({ estado: "error", mensaje: "Origen no permitido." });
    }
    return siguiente();
});

app.use(express.json({ limit: "128kb" }));
app.use("/api", function (solicitud, respuesta, siguiente) {
    respuesta.setHeader("Cache-Control", "no-store");
    return siguiente();
});
app.use("/api/estado", rutasEstado);
app.use("/api/auth", rutasAuth);
app.use("/api/agentes", exigirCoach, rutasAgentes);
app.use("/api/catalogos", exigirCoach, rutasCatalogos);
app.use("/api/sesiones", exigirCoach, rutasCoaching);
app.use("/Frontend", express.static(carpetaFrontend, { dotfiles: "deny", index: false }));
app.get("/", function (solicitud, respuesta) { respuesta.redirect("/Frontend/index.html"); });

export const servidor = app.listen(configuracion.puerto, "127.0.0.1", function () {
    console.log(`Servidor de Smart Coach disponible en ${origenPermitido}`);
});
