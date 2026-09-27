import { Router } from "express";
import { crearSesionCoaching } from "../controllers/coaching.controller.js";

const rutasCoaching = Router();
rutasCoaching.post("/coaching", crearSesionCoaching);
export default rutasCoaching;
