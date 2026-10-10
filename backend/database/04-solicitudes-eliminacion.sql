-- Ejecutar una vez en la base smart_coach existente con una conexión administradora.
-- Solo agrega la tabla de solicitudes. No modifica ni elimina sesiones actuales.
USE smart_coach;

CREATE TABLE IF NOT EXISTS solicitudes_eliminacion_sesion (
    solicitud_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sesion_id BIGINT UNSIGNED NOT NULL,
    solicitante_coach_id VARCHAR(32) NOT NULL,
    motivo VARCHAR(1000) NOT NULL,
    estado ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    revisado_por VARCHAR(32) NULL,
    respuesta_revision TEXT NULL,
    sesion_pendiente_id BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN estado = 'PENDIENTE' THEN sesion_id ELSE NULL END
    ) STORED,
    PRIMARY KEY (solicitud_id),
    UNIQUE KEY uq_solicitud_pendiente (sesion_pendiente_id),
    INDEX idx_solicitudes_sesion_fecha (sesion_id, fecha_solicitud),
    CONSTRAINT chk_solicitud_motivo CHECK (CHAR_LENGTH(TRIM(motivo)) BETWEEN 20 AND 1000),
    CONSTRAINT fk_solicitud_sesion FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_solicitud_coach FOREIGN KEY (solicitante_coach_id) REFERENCES usuarios(employee_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_solicitud_revisor FOREIGN KEY (revisado_por) REFERENCES usuarios(employee_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

SELECT COUNT(*) AS tablas_creadas
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'solicitudes_eliminacion_sesion';
