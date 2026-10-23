import { Router } from "express";
import { exigirManager, exigirUsuario } from "../auth/auth.middleware.js";
import { registrarCoach, iniciarSesion, consultarSesion, cerrarSesionActual } from "../controllers/auth.controller.js";

const rutasAuth = Router();
rutasAuth.post("/registro", exigirManager, registrarCoach);
rutasAuth.post("/login", iniciarSesion);
rutasAuth.get("/me", exigirUsuario, consultarSesion);
rutasAuth.post("/logout", cerrarSesionActual);
export default rutasAuth;
