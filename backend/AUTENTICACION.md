# Acceso local de Smart Coach

El login ya consulta al backend. El servidor verifica el correo y el hash guardado en `usuarios.password_hash`. El navegador recibe una cookie de sesión `HttpOnly`; JavaScript no puede leer su token. Las rutas de agentes, catálogos y sesiones exigen una sesión válida y el rol `Coach`. El listado se filtra con el identificador de la cuenta autenticada.

## Primera configuración de una cuenta Coach

1. Abre una terminal en VS Code y entra a `backend`.
2. Ejecuta `node .\src\config\configurar-clave-usuario.js`.
3. Escribe el correo de una cuenta Coach activa, por ejemplo `jessyka.najar@smartcoach.com`.
4. Escribe una contraseña de al menos 12 caracteres dos veces. No se muestra mientras la escribes.
5. Abre `Frontend/index.html` con Live Server, inicia el backend y entra con ese correo y la clave que acabas de elegir.

El texto de la contraseña no se imprime ni se guarda en el proyecto. El script genera una sal aleatoria y guarda en MySQL únicamente el resultado de `scrypt`.

## Flujo de la sesión

1. `POST /api/auth/login` busca la cuenta activa y compara la contraseña con su hash.
2. Si la comprobación funciona, el backend crea un token aleatorio y envía una cookie protegida durante ocho horas.
3. `GET /api/auth/sesion` devuelve el nombre y el rol para el inicio.
4. El navegador envía la cookie al consultar las rutas del backend.
5. `POST /api/auth/logout` revoca la sesión y borra la cookie.

La lista de sesiones se mantiene en memoria en esta versión de aprendizaje. Reiniciar el backend cierra las sesiones activas y cada usuario deberá iniciar sesión otra vez. Este diseño local no es una autenticación lista para publicar: antes de desplegarla se requiere almacenamiento persistente de sesiones, controles contra intentos repetidos, gestión de recuperación de cuenta, permisos completos por rol, HTTPS y revisión de seguridad.

El backend permite como origen web local `http://localhost:5500` y `http://127.0.0.1:5500`, correspondientes a Live Server.
