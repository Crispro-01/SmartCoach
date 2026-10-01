import { Router } from "express";
import {
    iniciarSesion,
    consultarSesion,
    cerrarSesionActual
} from "../controllers/auth.controller.js";
import { exigirAutenticacion } from "../auth/auth.middleware.js";

const rutasAuth = Router();

rutasAuth.post("/login", iniciarSesion);
rutasAuth.get("/sesion", exigirAutenticacion, consultarSesion);
rutasAuth.post("/logout", exigirAutenticacion, cerrarSesionActual);

export default rutasAuth;
