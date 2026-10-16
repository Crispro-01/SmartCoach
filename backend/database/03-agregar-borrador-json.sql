-- Agrega almacenamiento para el contenido parcial de una sesion en borrador.
-- Ejecutar en la base smart_coach existente; es seguro volver a ejecutarlo.
-- No modifica ni elimina los datos actuales de sesiones.

USE smart_coach;

SELECT COUNT(*) INTO @existe_borrador_json
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sesiones'
  AND COLUMN_NAME = 'borrador_json';

SET @sql_agregar_borrador_json = IF(
    @existe_borrador_json = 0,
    'ALTER TABLE sesiones ADD COLUMN borrador_json JSON NULL',
    'SELECT ''La columna borrador_json ya existe; no se hicieron cambios'' AS resultado'
);

PREPARE sentencia_agregar_borrador_json FROM @sql_agregar_borrador_json;
EXECUTE sentencia_agregar_borrador_json;
DEALLOCATE PREPARE sentencia_agregar_borrador_json;

-- Comprobacion: debe aparecer una sola fila con el tipo json.
SHOW COLUMNS FROM sesiones LIKE 'borrador_json';
