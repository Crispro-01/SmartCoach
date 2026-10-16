# API de Smart Coach

Esta guía describe las rutas conectadas en `backend/src/app.js`. En desarrollo local, la aplicación sirve tanto el frontend como la API desde `http://127.0.0.1:3000`; si `PORT` está configurado en `backend/.env`, se utiliza ese puerto. La ruta `/` redirige a `/Frontend/index.html`.

## Acceso y roles

- `POST /api/auth/login`: inicia sesión con correo y contraseña. La respuesta incluye una cookie de sesión `HttpOnly` y `SameSite=Strict`.
- `GET /api/auth/me`: devuelve los datos públicos de la sesión actual; requiere usuario autenticado.
- `POST /api/auth/logout`: cierra la sesión actual y limpia la cookie.
- Las rutas de agentes, catálogos y sesiones requieren el rol **Coach**.
- Las rutas `/api/revision/*` requieren el rol **Manager**.
- El estado de la API (`GET /api/estado`) es público.

La autorización vuelve a consultar en MySQL que la cuenta siga activa y conserva el rol permitido para cada área. Las operaciones que escriben datos también verifican que el origen corresponda al servidor local configurado.

## Rutas disponibles

| Método | Ruta | Rol | Uso y efecto |
|---|---|---|---|
| `GET` | `/api/estado` | Público | Comprueba que la API responde; solo lectura. |
| `POST` | `/api/auth/login` | Público | Valida credenciales y crea una sesión. |
| `GET` | `/api/auth/me` | Usuario autenticado | Consulta los datos públicos de la sesión actual. |
| `POST` | `/api/auth/logout` | Sesión actual | Invalida la sesión y limpia la cookie. |
| `GET` | `/api/agentes` | Coach | Lista agentes activos del equipo y el resumen de sus sesiones. |
| `GET` | `/api/agentes/:id` | Coach | Consulta un agente activo por su ID de empleado. |
| `GET` | `/api/catalogos/coaching` | Coach | Devuelve comportamientos, Call Drivers agrupados, KPIs y tipos de seguimiento activos. |
| `GET` | `/api/sesiones` | Coach | Lista sus sesiones de Coaching de agentes activos de su equipo, de más reciente a más antigua. Incluye borradores y completadas, pero excluye las archivadas por aprobación. Solo lectura. |
| `POST` | `/api/sesiones/coaching` | Coach | Crea una sesión completa o convierte un borrador en sesión completada. Guarda sus bloques en una transacción MySQL. |
| `POST` | `/api/sesiones/coaching/borradores` | Coach | Guarda un borrador editable. |
| `GET` | `/api/sesiones/coaching/borradores/:id?agenteId=...` | Coach | Consulta un borrador propio. |
| `PUT` | `/api/sesiones/coaching/borradores/:id` | Coach | Actualiza solo un borrador propio; una sesión completada se rechaza. |
| `GET` | `/api/sesiones/coaching/:id?agenteId=...` | Coach | Consulta una sesión completada de su equipo, excepto si fue archivada mediante una aprobación. |
| `POST` | `/api/sesiones/coaching/:id/solicitudes-eliminacion` | Coach | Registra el motivo para que un Manager revise la solicitud; no borra la sesión. |
| `GET` | `/api/revision/solicitudes` | Manager | Lista solicitudes de los Coaches que pertenecen a su equipo. |
| `PUT` | `/api/revision/solicitudes/:id` | Manager | Aprueba o rechaza una solicitud pendiente con justificación. |
| `GET` | `/api/revision/sesiones/coaching/:id?agenteId=...` | Manager | Consulta el detalle de una sesión de su equipo, incluso si fue archivada. |

Los borradores pueden editarse. Las sesiones completadas no tienen una ruta de edición: para retirarlas del historial normal se solicita una revisión. Si el Manager aprueba, la sesión queda archivada para el Coach, pero sus datos se conservan en MySQL. No existe una eliminación física directa desde la interfaz.

## Guardado transaccional de Coaching

El formulario real construye el objeto en `Frontend/formulario-coaching.js` (`construirPayloadCoaching`). Los IDs se cargan desde `/api/catalogos/coaching`; la API vuelve a validarlos en el servidor, sin confiar solamente en las validaciones del navegador. Para guardar una sesión se requieren exactamente dos llamadas y la evaluación de todos los comportamientos activos en ambas llamadas. Una apertura debe usar el tipo de seguimiento **Constructivo** y el número de sesión 1.

Al guardar, el backend persiste la sesión, el detalle, las llamadas, sus evaluaciones, los resultados de comportamiento, el KPI, los compromisos y el análisis RCA dentro de una transacción. Si una validación o escritura falla, revierte la transacción para evitar registros parciales. Al completar un borrador se conserva el mismo ID y su contenido temporal se limpia como parte de la misma transacción.

## Solicitudes de eliminación

El Coach debe indicar un motivo de 20 a 1000 caracteres. La solicitud queda pendiente y la sesión continúa disponible mientras se revisa. El Manager solo puede resolver solicitudes de su equipo, con una justificación de 20 a 1000 caracteres. La aprobación la archiva del historial normal; el rechazo la mantiene visible. En ambos casos se conserva la sesión y el resultado de la revisión para mantener trazabilidad.

## Formato de respuestas y entorno

Las respuestas usan JSON; normalmente incluyen `estado: "ok"` y los datos en `datos`. Los errores de entrada o permisos devuelven códigos HTTP 4xx, y los errores inesperados de servidor devuelven 500. La API aplica `Cache-Control: no-store` a `/api/*`.

Este proyecto se ejecuta localmente para desarrollo y formación. Antes de usarlo con datos reales o publicarlo en Internet se deben revisar y endurecer la configuración de despliegue, el manejo de sesiones, secretos y demás controles de seguridad.
