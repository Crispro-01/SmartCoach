import { Router } from "express";
import { consultarSesionCoaching } from "../controllers/consulta-coaching.controller.js";
import {
    listarSolicitudesRevision,
    resolverSolicitudRevision
} from "../controllers/revision-solicitudes.controller.js";

const rutasRevision = Router();
rutasRevision.get("/solicitudes", listarSolicitudesRevision);
rutasRevision.put("/solicitudes/:id", resolverSolicitudRevision);
rutasRevision.get("/sesiones/coaching/:id", consultarSesionCoaching);

export default rutasRevision;
