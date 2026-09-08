import { Router } from "express";
import { listarAgentes, obtenerAgentePorId } from "../controllers/agentes.controller.js";

const rutasAgentes = Router();

rutasAgentes.get("/", listarAgentes);
rutasAgentes.get("/:id", obtenerAgentePorId);

export default rutasAgentes;
