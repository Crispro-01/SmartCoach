import { Router } from "express";
import { consultarSesionCoaching } from "../controllers/consulta-coaching.controller.js";
import {
    listarSolicitudesRevision,
    resolverSolicitudRevision
} from "../controllers/revision-solicitudes.controller.js";

import { consultarItgf } from "../controllers/itgf.controller.js";
import { consultarCorrectiva } from "../controllers/correctivas.controller.js";

const rutasRevision = Router();
rutasRevision.get("/solicitudes", listarSolicitudesRevision);
rutasRevision.put("/solicitudes/:id", resolverSolicitudRevision);
rutasRevision.get("/sesiones/coaching/:id", consultarSesionCoaching);

rutasRevision.get("/sesiones/itgf/:id", consultarItgf);
rutasRevision.get("/sesiones/correctivas/:tipo/:id", consultarCorrectiva);

export default rutasRevision;
