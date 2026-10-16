# API de Smart Coach (estado actual)

Esta guía describe la API que existe en el proyecto para la evidencia **GA7-220501096-AA5-EV02: Producto API**. La base local es `http://localhost:3000`; si `PORT` está definido en `backend/.env`, se usa ese puerto.

## Endpoints implementados

| Método | Ruta | Uso | Efecto |
|---|---|---|---|
| `GET` | `/api/estado` | Comprueba que la API está disponible. | Solo lectura. |
| `GET` | `/api/agentes` | Lista agentes activos y el resumen de sus sesiones. Admite `?supervisorId=COACH001`. | Solo lectura. |
| `GET` | `/api/agentes/:id` | Consulta un agente activo por su ID de empleado. | Solo lectura. |
| `GET` | `/api/catalogos/coaching` | Devuelve comportamientos, Call Drivers agrupados por categoría, KPIs y tipos de seguimiento. | Solo lectura. |
| `POST` | `/api/sesiones/coaching` | Valida y guarda una sesión completa de Coaching y sus registros relacionados dentro de una transacción MySQL. | **Escribe datos**; no repetir en pruebas sin querer crear otro Coaching. |

La API no implementa actualmente `PUT`, `PATCH` ni `DELETE` para sesiones. No existe una eliminación directa de Coachings desde el backend.

## Formato general

Las respuestas de éxito usan JSON y, cuando corresponde, incluyen `estado: "ok"` y los datos en `datos`. Los errores de validación devuelven un mensaje y un código HTTP 4xx; los errores inesperados de servidor devuelven 500. Para solicitudes JSON se usa `Content-Type: application/json`.

### Ejemplo de respuesta de disponibilidad

```json
{
  "estado": "ok",
  "mensaje": "API de Smart Coach funcionando"
}
```

### Cuerpo de creación de Coaching

El formulario real construye el objeto en `Frontend/formulario-coaching.js` (`construirPayloadCoaching`). Los IDs deben elegirse de `/api/catalogos/coaching`; ambas llamadas necesitan evaluar todos los comportamientos activos (actualmente 14), y la sesión exige exactamente dos llamadas.

```json
{
  "agentId": "TM001",
  "opening": true,
  "followUpTypeId": 1,
  "sessionNumber": 1,
  "behaviorWorkedId": 1,
  "calls": [
    {
      "number": 1,
      "contactId": "DEMO-LLAMADA-1",
      "callDriverId": 1,
      "summary": "Ejemplo de práctica; no contiene información real de clientes.",
      "resolved": true,
      "evaluations": [{ "behaviorId": 1, "fulfilled": true }]
    },
    {
      "number": 2,
      "contactId": "DEMO-LLAMADA-2",
      "callDriverId": 1,
      "summary": "Segunda llamada ficticia para la demostración.",
      "resolved": true,
      "evaluations": [{ "behaviorId": 1, "fulfilled": true }]
    }
  ],
  "kpi": {
    "kpiId": 1,
    "resultMtd": "10",
    "previousGoal": "",
    "currentResult": "10",
    "nextGoal": "11"
  },
  "commitments": {
    "coach": { "what": "Revisar la práctica", "how": "En una sesión de seguimiento", "when": "Próxima semana", "recognition": "Reconocer el esfuerzo" },
    "agent": { "what": "Practicar el comportamiento", "how": "Aplicándolo en llamadas de práctica", "when": "Durante la semana", "evaluation": "Revisar el avance", "recognition": "Valorar el avance" }
  },
  "rca": {
    "activity": "Práctica guiada", "closingBehavior": true, "callsWithBehavior": "2 de 2",
    "trendLast3Weeks": "En observación", "reasonNotPerformed": "No aplica a esta sesión de apertura",
    "activityToOvercome": "Practicar", "whyContinue": "Consolidar el comportamiento",
    "roleplayResult": "Práctica completada", "currentAttainment": "10", "kpiChange": "Seguimiento pendiente",
    "behaviorChange": "Revisar en el siguiente acompañamiento"
  },
  "durationSeconds": 300
}
```

**Importante:** el fragmento de `evaluations` anterior solo ilustra la forma de un elemento. Para que `POST` pase la validación hay que enviar los 14 comportamientos activos, con todos sus IDs distintos, para cada una de las dos llamadas. `opening: true` debe usar el tipo de seguimiento Constructivo y la sesión número 1. Además, `TM001` debe ser un agente activo con un Coach activo asignado.

Al aceptar la solicitud, el backend guarda la sesión, llamadas, evaluaciones, KPI, compromisos y RCA en una sola transacción. Si una validación o escritura falla, hace rollback y responde con error; no debe quedar una sesión parcialmente grabada.

## Privacidad, edición y solicitudes de eliminación

El backend actual no ofrece edición ni eliminación de sesiones. El requisito acordado para una futura eliminación es que nunca se borre un Coaching directamente: se debe registrar una solicitud separada con el motivo, solicitante y fecha; una persona autorizada distinta la revisará, y el sistema deberá conservar el resultado de aprobación o rechazo y su historial. La eliminación solo podría ocurrir después de aprobarse y dejar auditoría. Este flujo **todavía no está implementado**; requiere autenticación y autorización verificables, una tabla de solicitudes/auditoría y controles de integridad. No ejecutar `DELETE` manualmente como parte de las pruebas.

## Seguridad del entorno actual

Esta API es una etapa local de desarrollo. El backend todavía no autentica ni identifica de forma confiable a la persona que solicita operaciones. Por ello no debe publicarse en Internet ni considerarse lista para uso real con información de clientes. La colección de Postman incluida ejecuta únicamente solicitudes `GET`.
