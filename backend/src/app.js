import express from "express";
import { configuracion } from "./config/env.js";
import rutasEstado from "./routes/estado.routes.js";
import rutasAgentes from "./routes/agentes.routes.js";

const app = express();

app.use(express.json());
app.use("/api/estado", rutasEstado);
app.use("/api/agentes", rutasAgentes);

app.listen(configuracion.puerto, function () {
    console.log(`Servidor de Smart Coach disponible en http://localhost:${configuracion.puerto}`);
});
