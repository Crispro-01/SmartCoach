import express from "express";

const app = express();
const PUERTO = 3000;

app.use(express.json());

app.get("/api/salud", function (solicitud, respuesta) {
    respuesta.json({
        estado: "ok",
        mensaje: "API de Smart Coach funcionando"
    });
});

app.listen(PUERTO, function () {
    console.log(`Servidor de Smart Coach disponible en http://localhost:${PUERTO}`);
});
