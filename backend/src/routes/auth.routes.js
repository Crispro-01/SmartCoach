import { Router } from "express";
import { exigirCoach } from "../auth/auth.middleware.js";
import { iniciarSesion, consultarSesion, cerrarSesionActual } from "../controllers/auth.controller.js";

const rutasAuth = Router();
rutasAuth.post("/login", iniciarSesion);
rutasAuth.get("/me", exigirCoach, consultarSesion);
rutasAuth.post("/logout", cerrarSesionActual);
export default rutasAuth;
