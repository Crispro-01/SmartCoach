import { Router } from "express";
import { comprobarEstado } from "../controllers/estado.controller.js";

const rutasEstado = Router();

rutasEstado.get("/", comprobarEstado);

export default rutasEstado;
