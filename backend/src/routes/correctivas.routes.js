import { Router } from "express";
import { crearBorradorCorrectiva, obtenerBorradorCorrectiva, actualizarBorradorCorrectiva,
    descartarBorradorCorrectiva, completarCorrectiva, consultarCorrectiva,
    solicitarEliminacionCorrectiva } from "../controllers/correctivas.controller.js";

const rutasCorrectivas = Router();
rutasCorrectivas.post("/:tipo", completarCorrectiva);
rutasCorrectivas.post("/:tipo/borradores", crearBorradorCorrectiva);
rutasCorrectivas.get("/:tipo/borradores/:id", obtenerBorradorCorrectiva);
rutasCorrectivas.put("/:tipo/borradores/:id", actualizarBorradorCorrectiva);
rutasCorrectivas.delete("/:tipo/borradores/:id", descartarBorradorCorrectiva);
rutasCorrectivas.get("/:tipo/:id", consultarCorrectiva);
rutasCorrectivas.post("/:tipo/:id/solicitudes-eliminacion", solicitarEliminacionCorrectiva);
export default rutasCorrectivas;
