import { Router } from "express";
import { obtenerCatalogosCoaching } from "../controllers/catalogos.controller.js";

const rutasCatalogos = Router();

rutasCatalogos.get("/coaching", obtenerCatalogosCoaching);

export default rutasCatalogos;
