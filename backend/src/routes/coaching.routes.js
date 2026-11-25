import { Router } from "express";
import {
    crearSesionCoaching,
    crearBorradorCoaching,
    obtenerBorradorCoaching,
    actualizarBorradorCoaching,
    descartarBorradorCoaching
} from "../controllers/coaching.controller.js";
import { consultarSesionCoaching } from "../controllers/consulta-coaching.controller.js";
import { solicitarEliminacionCoaching } from "../controllers/solicitudes-eliminacion.controller.js";
import { listarHistorial } from "../controllers/historial.controller.js";
import rutasCorrectivas from "./correctivas.routes.js";

import { crearBorradorItgf, obtenerBorradorItgf, actualizarBorradorItgf,
    descartarBorradorItgf, completarItgf, consultarItgf } from "../controllers/itgf.controller.js";

const rutasCoaching = Router();
rutasCoaching.use("/correctivas", rutasCorrectivas);
rutasCoaching.post("/itgf", completarItgf);
rutasCoaching.post("/itgf/borradores", crearBorradorItgf);
rutasCoaching.get("/itgf/borradores/:id", obtenerBorradorItgf);
rutasCoaching.put("/itgf/borradores/:id", actualizarBorradorItgf);
rutasCoaching.delete("/itgf/borradores/:id", descartarBorradorItgf);
rutasCoaching.get("/itgf/:id", consultarItgf);
rutasCoaching.post("/itgf/:id/solicitudes-eliminacion", (req, res) => solicitarEliminacionCoaching(req, res, "ITGF"));
rutasCoaching.get("/", listarHistorial);
rutasCoaching.post("/coaching", crearSesionCoaching);
rutasCoaching.post("/coaching/borradores", crearBorradorCoaching);
rutasCoaching.get("/coaching/borradores/:id", obtenerBorradorCoaching);
rutasCoaching.put("/coaching/borradores/:id", actualizarBorradorCoaching);
rutasCoaching.delete("/coaching/borradores/:id", descartarBorradorCoaching);
rutasCoaching.get("/coaching/:id", consultarSesionCoaching);
rutasCoaching.post("/coaching/:id/solicitudes-eliminacion", (req, res) => solicitarEliminacionCoaching(req, res));
export default rutasCoaching;
