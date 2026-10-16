# Estándar de codificación de Smart Coach

Este estándar aplica al backend JavaScript, al frontend web y a los scripts SQL del proyecto. Su objetivo es que el código se lea de forma consistente y que las operaciones sobre las sesiones sean seguras y verificables.

## Formato y nombres

- Guardar los archivos en UTF-8, terminar cada archivo con salto de línea y eliminar espacios sobrantes al final de las líneas.
- Usar cuatro espacios para indentar JavaScript, HTML, CSS, Markdown y SQL; usar dos espacios para JSON. Estas reglas también están configuradas en `.editorconfig`.
- Usar módulos ES (`import`/`export`) en el backend.
- Nombrar variables y funciones en `camelCase`; usar `PascalCase` para clases; reservar `MAYUSCULAS_CON_GUION_BAJO` para constantes de configuración que no cambian.
- Elegir nombres descriptivos y mantener los mensajes visibles para el usuario en español.

## Backend, API y base de datos

- Validar los datos recibidos en el backend aunque el formulario también los valide en el navegador.
- Usar consultas SQL parametrizadas (`?`) para los valores recibidos; no concatenar entradas del usuario dentro de la consulta.
- Mantener respuestas de API con una estructura consistente y códigos HTTP que distingan errores de validación, permisos y fallos del servidor.
- Agrupar en una transacción las operaciones que guardan varios registros relacionados; confirmar todo al terminar y revertirlo si falla alguna escritura.
- Permitir editar solo los borradores. Las sesiones completadas no se editan; su retiro del historial pasa por una solicitud justificada y revisión de Manager. La aprobación archiva la sesión y conserva la trazabilidad.
- No incluir contraseñas, tokens ni otros secretos en el código, la documentación pública o los commits. Se configuran localmente mediante `.env`, excluido del control de versiones.

## Interfaz y pruebas

- Mantener la separación existente entre páginas HTML, estilos CSS y lógica JavaScript del navegador.
- Cargar desde la API los catálogos que se mantienen en MySQL; no duplicar listas de negocio en el formulario.
- Para cambios de backend, agregar o actualizar pruebas con `node:test`. Cubrir el resultado esperado y, cuando aplique, los errores y el rollback de la transacción.
- Ejecutar `npm test` desde `backend` antes de crear un commit y comprobar que no haya fallos.
