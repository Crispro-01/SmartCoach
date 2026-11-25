# API de Smart Coach

Esta guía describe las rutas conectadas en `backend/src/app.js`. En desarrollo local, la aplicación sirve tanto el frontend como la API desde `http://127.0.0.1:3000`; si `PORT` está configurado en `backend/.env`, se utiliza ese puerto. La ruta `/` redirige a `/Frontend/index.html`.

## Acceso y roles

- `POST /api/auth/registro`: un Manager registra un Coach de su equipo con ID de empleado, nombre, correo y contraseña inicial. No existe registro público. MySQL recibe solo un hash de la contraseña.
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
| `POST` | `/api/auth/registro` | Manager | Registra un Coach de su equipo; devuelve 201, 400 por datos inválidos o 409 por ID/correo duplicado. |
| `POST` | `/api/auth/login` | Público | Valida credenciales y crea una sesión. |
| `GET` | `/api/auth/me` | Usuario autenticado | Consulta los datos públicos de la sesión actual. |
| `POST` | `/api/auth/logout` | Sesión actual | Invalida la sesión y limpia la cookie. |
| `GET` | `/api/agentes` | Coach | Lista agentes activos del equipo y el resumen de sus sesiones. |
| `GET` | `/api/agentes/:id` | Coach | Consulta un agente activo por su ID de empleado. |
| `GET` | `/api/catalogos/coaching` | Coach | Devuelve comportamientos, Call Drivers agrupados, KPIs y tipos de seguimiento activos. |
| `GET` | `/api/sesiones` | Coach | Lista sus sesiones de Coaching, ITGF, Accountability y Verbal Warning de agentes activos de su equipo, de más reciente a más antigua. Incluye borradores y completadas, pero excluye las archivadas por aprobación. Solo lectura. |
| `POST` | `/api/sesiones/coaching` | Coach | Crea una sesión completa o convierte un borrador en sesión completada. Guarda sus bloques en una transacción MySQL. |
| `POST` | `/api/sesiones/coaching/borradores` | Coach | Guarda un borrador editable. |
| `GET` | `/api/sesiones/coaching/borradores/:id?agenteId=...` | Coach | Consulta un borrador propio. |
| `PUT` | `/api/sesiones/coaching/borradores/:id` | Coach | Actualiza solo un borrador propio; una sesión completada se rechaza. |
| `GET` | `/api/sesiones/coaching/:id?agenteId=...` | Coach | Consulta una sesión completada de su equipo, excepto si fue archivada mediante una aprobación. |
| `POST` | `/api/sesiones/coaching/:id/solicitudes-eliminacion` | Coach | Registra el motivo para que un Manager revise la solicitud; no borra la sesión. |
| `GET` | `/api/revision/solicitudes` | Manager | Lista solicitudes de los Coaches que pertenecen a su equipo. |
| `PUT` | `/api/revision/solicitudes/:id` | Manager | Aprueba o rechaza una solicitud pendiente con justificación. |
| `GET` | `/api/revision/sesiones/coaching/:id?agenteId=...` | Manager | Consulta el detalle de una sesión de su equipo, incluso si fue archivada. |

### Registro e inicio de sesión

El Manager usa `Frontend/registrar-coach.html` para enviar `POST /api/auth/registro` con `employeeId`, `nombre`, `correo` y `contrasena`. El servidor fija el rol **Coach** y asigna al Manager autenticado como supervisor: el navegador no puede elegir ni elevar el rol. El correo y el ID deben ser únicos. La respuesta nunca incluye la contraseña ni su hash.

El Coach registrado inicia sesión en `Frontend/index.html` mediante `POST /api/auth/login` con `correo` y `contrasena`. Una respuesta correcta es `200` con `estado: "ok"` y una cookie de sesión; credenciales incorrectas dan `401` con un mensaje genérico. Se limitan los intentos repetidos desde una misma IP. Las peticiones de escritura hechas fuera del navegador deben incluir el encabezado `Origin` correspondiente al servidor local configurado.

Los borradores pueden editarse. Las sesiones completadas no tienen una ruta de edición: para retirarlas del historial normal se solicita una revisión. Si el Manager aprueba, la sesión queda archivada para el Coach, pero sus datos se conservan en MySQL. No existe una eliminación física directa desde la interfaz.

## Guardado transaccional de Coaching

El formulario real construye el objeto en `Frontend/formulario-coaching.js` (`construirPayloadCoaching`). Los IDs se cargan desde `/api/catalogos/coaching`; la API vuelve a validarlos en el servidor, sin confiar solamente en las validaciones del navegador. Para guardar una sesión se requieren exactamente dos llamadas y la evaluación de todos los comportamientos activos en ambas llamadas. Una apertura debe usar el tipo de seguimiento **Constructivo** y el número de sesión 1.

Al guardar, el backend persiste la sesión, el detalle, las llamadas, sus evaluaciones, los resultados de comportamiento, el KPI, los compromisos y el análisis RCA dentro de una transacción. Si una validación o escritura falla, revierte la transacción para evitar registros parciales. Al completar un borrador se conserva el mismo ID y su contenido temporal se limpia como parte de la misma transacción.

## ITGF

ITGF usa las tablas existentes `sesiones` y `sesiones_itgf`; no requiere migración. Comparte los catálogos activos de Call Drivers y comportamientos y obtiene el agente desde la API, sin listas fijas de nombres.

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/sesiones/itgf/borradores` | Guarda contenido parcial con `agentId`. |
| `GET` | `/api/sesiones/itgf/borradores/:id?agenteId=...` | Recupera una incompleta del Coach y su equipo activo. |
| `PUT` | `/api/sesiones/itgf/borradores/:id` | Actualiza una incompleta con `agentId` y sus campos. |
| `DELETE` | `/api/sesiones/itgf/borradores/:id` | Descarta únicamente la incompleta identificada; requiere `agentId`. |
| `POST` | `/api/sesiones/itgf` | Completa una sesión nueva o la incompleta indicada mediante `draftId`. |
| `GET` | `/api/sesiones/itgf/:id?agenteId=...` | Consulta el detalle completado y visible para el Coach. |
| `POST` | `/api/sesiones/itgf/:id/solicitudes-eliminacion` | Solicita revisión con `motivo` de 20 a 1000 caracteres. |
| `GET` | `/api/revision/sesiones/itgf/:id?agenteId=...` | El Manager consulta el detalle de su equipo, incluidas las archivadas. |

Las rutas `/api/sesiones/itgf*` exigen Coach. Completar requiere `agentId`, `contactId` (hasta 80 caracteres), `callDriverId`, `behaviorId`, `fulfilled` (booleano), `observations` (hasta 1500), `commitmentWhat`, `commitmentHow` y `commitmentWhen` (hasta 1000 cada uno). Un borrador admite campos vacíos y un máximo de 20 KB. Las escrituras se realizan dentro de una transacción; completar conserva el ID de la incompleta y limpia su JSON temporal. Una completada no se puede editar ni descartar como borrador (409).

El formulario `formulario-itgf.html` permite Guardar, Descartar y Completar, y regresa al perfil actualizado del agente. `detalle-itgf.html` muestra la sesión completada y deja la solicitud de eliminación al final. El historial general y Seguimiento incluyen Coaching e ITGF. La revisión usa las mismas rutas de solicitudes del Manager y conserva los motivos y decisiones.

## Accountability y Verbal Warning

Estas sesiones comparten la tabla existente `sesiones_correctivas`, vinculada a `sesiones`. No requieren migración. `tipo` solo admite los segmentos `accountability` y `verbal-warning`; el backend fija el tipo desde la ruta y comprueba que coincida con la sesión consultada. No se puede transformar una Accountability en Verbal Warning cambiando el cuerpo ni la URL.

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/sesiones/correctivas/:tipo/borradores` | Guarda campos parciales con `agentId`. |
| `GET` | `/api/sesiones/correctivas/:tipo/borradores/:id?agenteId=...` | Recupera una incompleta del equipo y tipo indicados. |
| `PUT` | `/api/sesiones/correctivas/:tipo/borradores/:id` | Actualiza una incompleta propia; requiere `agentId`. |
| `DELETE` | `/api/sesiones/correctivas/:tipo/borradores/:id` | Descarta únicamente la incompleta propia; requiere `agentId`. |
| `POST` | `/api/sesiones/correctivas/:tipo` | Completa una nueva sesión o la incompleta indicada por `draftId`. |
| `GET` | `/api/sesiones/correctivas/:tipo/:id?agenteId=...` | Consulta una completada visible para el Coach. |
| `POST` | `/api/sesiones/correctivas/:tipo/:id/solicitudes-eliminacion` | Solicita revisión con un motivo de 20 a 1000 caracteres. |
| `GET` | `/api/revision/sesiones/correctivas/:tipo/:id?agenteId=...` | El Manager consulta el detalle de su equipo, incluidas las archivadas. |

Completar requiere `agentId`, `cause` (situación o dificultad), `agentCommitment` y `coachCommitment`. Cada texto admite hasta 1500 caracteres y debe contener algo más que espacios. Guardar una incompleta admite campos vacíos y hasta 20 KB de JSON. Las escrituras usan transacciones y bloquean la incompleta para evitar completar y descartar simultáneamente. Una completada rechaza la edición o el descarte como borrador (409).

`Frontend/formulario-correctivo.html` obtiene el nombre del agente desde la API y conserva el tipo seleccionado. Guardar, Descartar y Completar regresan al perfil actualizado. `detalle-correctivo.html` muestra la situación y los compromisos, con la solicitud de eliminación al final. El historial, el resumen y Seguimiento incluyen los cuatro tipos; `rutas-sesion.js` mantiene sus enlaces de consulta y continuación, también desde la revisión del Manager.

## Solicitudes de eliminación

El Coach debe indicar un motivo de 20 a 1000 caracteres. La solicitud queda pendiente y la sesión continúa disponible mientras se revisa. El Manager solo puede resolver solicitudes de su equipo, con una justificación de 20 a 1000 caracteres. La aprobación la archiva del historial normal; el rechazo la mantiene visible. En ambos casos se conserva la sesión y el resultado de la revisión para mantener trazabilidad.

## Formato de respuestas y entorno

Las respuestas usan JSON; normalmente incluyen `estado: "ok"` y los datos en `datos`. Los errores de entrada o permisos devuelven códigos HTTP 4xx, y los errores inesperados de servidor devuelven 500. La API aplica `Cache-Control: no-store` a `/api/*`.

Este proyecto se ejecuta localmente para desarrollo y formación. Antes de usarlo con datos reales o publicarlo en Internet se deben revisar y endurecer la configuración de despliegue, el manejo de sesiones, secretos y demás controles de seguridad.
