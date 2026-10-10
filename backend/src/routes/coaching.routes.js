import { Router } from "express";
import {
    crearSesionCoaching,
    crearBorradorCoaching,
    obtenerBorradorCoaching,
    actualizarBorradorCoaching
} from "../controllers/coaching.controller.js";

const rutasCoaching = Router();
rutasCoaching.post("/coaching", crearSesionCoaching);
rutasCoaching.post("/coaching/borradores", crearBorradorCoaching);
rutasCoaching.get("/coaching/borradores/:id", obtenerBorradorCoaching);
rutasCoaching.put("/coaching/borradores/:id", actualizarBorradorCoaching);
export default rutasCoaching;
