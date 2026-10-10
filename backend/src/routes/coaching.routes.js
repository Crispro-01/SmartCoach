import { Router } from "express";
import {
    crearSesionCoaching,
    crearBorradorCoaching,
    obtenerBorradorCoaching,
    actualizarBorradorCoaching
} from "../controllers/coaching.controller.js";
import { consultarSesionCoaching } from "../controllers/consulta-coaching.controller.js";

const rutasCoaching = Router();
rutasCoaching.post("/coaching", crearSesionCoaching);
rutasCoaching.post("/coaching/borradores", crearBorradorCoaching);
rutasCoaching.get("/coaching/borradores/:id", obtenerBorradorCoaching);
rutasCoaching.put("/coaching/borradores/:id", actualizarBorradorCoaching);
rutasCoaching.get("/coaching/:id", consultarSesionCoaching);
export default rutasCoaching;
