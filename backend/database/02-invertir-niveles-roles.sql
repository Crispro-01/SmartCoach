-- Corrige los niveles en una base smart_coach creada con el orden anterior.
-- Conserva los rol_id y, por tanto, las relaciones de usuarios y sesiones.
-- Antes de ejecutar en Workbench, conserva un respaldo de la base.

USE smart_coach;

-- La columna nivel es unica: se quita temporalmente la restriccion
-- para intercambiar los valores sin colisiones intermedias.
ALTER TABLE roles DROP INDEX uq_roles_nivel;

UPDATE roles
SET nivel = CASE rol_id
    WHEN 1 THEN 6 -- Director
    WHEN 2 THEN 5 -- Senior Account Manager
    WHEN 3 THEN 4 -- Account Manager
    WHEN 4 THEN 3 -- Manager
    WHEN 5 THEN 2 -- Coach
    WHEN 6 THEN 1 -- Agente
    ELSE nivel
END
WHERE rol_id BETWEEN 1 AND 6;

-- Restablece la regla de que cada nivel se use una sola vez.
ALTER TABLE roles ADD CONSTRAINT uq_roles_nivel UNIQUE (nivel);

-- Comprobacion: Agente debe aparecer primero y Director al final.
SELECT rol_id, nombre, nivel
FROM roles
ORDER BY nivel;
