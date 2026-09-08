import express from "express";
import rutasEstado from "./routes/estado.routes.js";
import rutasAgentes from "./routes/agentes.routes.js";

const app = express();
const PUERTO = 3000;

app.use(express.json());
app.use("/api/estado", rutasEstado);
app.use("/api/agentes", rutasAgentes);

app.listen(PUERTO, function () {
    console.log(`Servidor de Smart Coach disponible en http://localhost:${PUERTO}`);
});
