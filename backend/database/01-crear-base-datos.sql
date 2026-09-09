-- Estructura completa de la base de datos de Smart Coach.
-- Compatible con MySQL 8.0.

CREATE DATABASE IF NOT EXISTS smart_coach
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE smart_coach;

-- =========================================================
-- 1. CATALOGOS GENERALES
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    rol_id TINYINT UNSIGNED NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    nivel TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (rol_id),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre),
    CONSTRAINT uq_roles_nivel UNIQUE (nivel),
    CONSTRAINT chk_roles_nivel CHECK (nivel BETWEEN 1 AND 6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_sesion (
    tipo_sesion_id TINYINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    PRIMARY KEY (tipo_sesion_id),
    CONSTRAINT uq_tipos_sesion_codigo UNIQUE (codigo),
    CONSTRAINT uq_tipos_sesion_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estados_sesion (
    estado_sesion_id TINYINT UNSIGNED NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(30) NOT NULL,
    PRIMARY KEY (estado_sesion_id),
    CONSTRAINT uq_estados_sesion_codigo UNIQUE (codigo),
    CONSTRAINT uq_estados_sesion_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_seguimiento (
    tipo_seguimiento_id TINYINT UNSIGNED NOT NULL,
    nombre VARCHAR(30) NOT NULL,
    PRIMARY KEY (tipo_seguimiento_id),
    CONSTRAINT uq_tipos_seguimiento_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comportamientos (
    comportamiento_id SMALLINT UNSIGNED NOT NULL,
    clave VARCHAR(60) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    orden TINYINT UNSIGNED NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (comportamiento_id),
    CONSTRAINT uq_comportamientos_clave UNIQUE (clave),
    CONSTRAINT uq_comportamientos_orden UNIQUE (orden)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias_call_driver (
    categoria_call_driver_id TINYINT UNSIGNED NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    orden TINYINT UNSIGNED NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (categoria_call_driver_id),
    CONSTRAINT uq_categorias_call_driver_nombre UNIQUE (nombre),
    CONSTRAINT uq_categorias_call_driver_orden UNIQUE (orden)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS call_drivers (
    call_driver_id SMALLINT UNSIGNED NOT NULL,
    categoria_call_driver_id TINYINT UNSIGNED NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    orden TINYINT UNSIGNED NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (call_driver_id),
    CONSTRAINT uq_call_drivers_nombre UNIQUE (nombre),
    CONSTRAINT uq_call_drivers_categoria_orden
        UNIQUE (categoria_call_driver_id, orden),
    CONSTRAINT fk_call_drivers_categoria
        FOREIGN KEY (categoria_call_driver_id)
        REFERENCES categorias_call_driver(categoria_call_driver_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kpis (
    kpi_id TINYINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (kpi_id),
    CONSTRAINT uq_kpis_codigo UNIQUE (codigo),
    CONSTRAINT uq_kpis_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- =========================================================
-- 2. USUARIOS Y JERARQUIA
-- =========================================================

CREATE TABLE IF NOT EXISTS usuarios (
    employee_id VARCHAR(32) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    rol_id TINYINT UNSIGNED NOT NULL,
    supervisor_id VARCHAR(32) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id),
    INDEX idx_usuarios_supervisor (supervisor_id),
    INDEX idx_usuarios_rol (rol_id),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT chk_usuarios_supervisor_distinto
        CHECK (supervisor_id IS NULL OR supervisor_id <> employee_id),
    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id) REFERENCES roles(rol_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_usuarios_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES usuarios(employee_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================================================
-- 3. SESION GENERAL
-- =========================================================

CREATE TABLE IF NOT EXISTS sesiones (
    sesion_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agente_id VARCHAR(32) NOT NULL,
    coach_id VARCHAR(32) NOT NULL,
    tipo_sesion_id TINYINT UNSIGNED NOT NULL,
    estado_sesion_id TINYINT UNSIGNED NOT NULL,
    tema VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inicio_cronometro DATETIME NULL,
    duracion_segundos INT UNSIGNED NULL,
    fecha_completada DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sesion_id),
    INDEX idx_sesiones_agente_fecha (agente_id, fecha_creacion),
    INDEX idx_sesiones_coach_fecha (coach_id, fecha_creacion),
    INDEX idx_sesiones_tipo_estado (tipo_sesion_id, estado_sesion_id),
    CONSTRAINT chk_sesiones_duracion
        CHECK (duracion_segundos IS NULL OR duracion_segundos >= 0),
    CONSTRAINT fk_sesiones_agente
        FOREIGN KEY (agente_id) REFERENCES usuarios(employee_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_sesiones_coach
        FOREIGN KEY (coach_id) REFERENCES usuarios(employee_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_sesiones_tipo
        FOREIGN KEY (tipo_sesion_id) REFERENCES tipos_sesion(tipo_sesion_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_sesiones_estado
        FOREIGN KEY (estado_sesion_id) REFERENCES estados_sesion(estado_sesion_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- fecha_creacion registra cuando se creo el documento.
-- inicio_cronometro se registra solo cuando el Coach pulsa Play.

-- =========================================================
-- 4. FORMULARIO CORRECTIVO
--    Accountability y Verbal Warning usan esta misma tabla.
-- =========================================================

CREATE TABLE IF NOT EXISTS sesiones_correctivas (
    sesion_id BIGINT UNSIGNED NOT NULL,
    causa_situacion TEXT NOT NULL,
    compromiso_representante TEXT NOT NULL,
    compromiso_coach TEXT NOT NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT fk_correctivas_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- 5. FORMULARIO ITGF
-- =========================================================

CREATE TABLE IF NOT EXISTS sesiones_itgf (
    sesion_id BIGINT UNSIGNED NOT NULL,
    contact_id VARCHAR(80) NOT NULL,
    call_driver_id SMALLINT UNSIGNED NOT NULL,
    comportamiento_id SMALLINT UNSIGNED NOT NULL,
    cumplio_comportamiento BOOLEAN NOT NULL,
    observaciones TEXT NOT NULL,
    compromiso_que TEXT NOT NULL,
    compromiso_como TEXT NOT NULL,
    compromiso_cuando TEXT NOT NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT fk_itgf_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_itgf_call_driver
        FOREIGN KEY (call_driver_id) REFERENCES call_drivers(call_driver_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_itgf_comportamiento
        FOREIGN KEY (comportamiento_id)
        REFERENCES comportamientos(comportamiento_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================================================
-- 6. FORMULARIO COACHING GROW
-- =========================================================

CREATE TABLE IF NOT EXISTS coaching_detalles (
    sesion_id BIGINT UNSIGNED NOT NULL,
    apertura_comportamiento BOOLEAN NOT NULL,
    tipo_seguimiento_id TINYINT UNSIGNED NOT NULL,
    numero_sesion SMALLINT UNSIGNED NOT NULL,
    comportamiento_trabajado_id SMALLINT UNSIGNED NOT NULL,
    comportamiento_realizado BOOLEAN NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT chk_coaching_numero_sesion CHECK (numero_sesion >= 1),
    CONSTRAINT fk_coaching_detalle_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_coaching_detalle_seguimiento
        FOREIGN KEY (tipo_seguimiento_id)
        REFERENCES tipos_seguimiento(tipo_seguimiento_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_coaching_detalle_comportamiento
        FOREIGN KEY (comportamiento_trabajado_id)
        REFERENCES comportamientos(comportamiento_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_llamadas (
    llamada_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sesion_id BIGINT UNSIGNED NOT NULL,
    numero_llamada TINYINT UNSIGNED NOT NULL,
    contact_id VARCHAR(80) NOT NULL,
    call_driver_id SMALLINT UNSIGNED NOT NULL,
    resumen TEXT NOT NULL,
    hubo_resolucion BOOLEAN NOT NULL,
    PRIMARY KEY (llamada_id),
    CONSTRAINT uq_coaching_llamada_numero UNIQUE (sesion_id, numero_llamada),
    CONSTRAINT chk_coaching_numero_llamada
        CHECK (numero_llamada IN (1, 2)),
    CONSTRAINT fk_coaching_llamada_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_coaching_llamada_call_driver
        FOREIGN KEY (call_driver_id) REFERENCES call_drivers(call_driver_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_evaluaciones_llamada (
    llamada_id BIGINT UNSIGNED NOT NULL,
    comportamiento_id SMALLINT UNSIGNED NOT NULL,
    cumplio BOOLEAN NOT NULL,
    PRIMARY KEY (llamada_id, comportamiento_id),
    CONSTRAINT fk_evaluaciones_llamada
        FOREIGN KEY (llamada_id) REFERENCES coaching_llamadas(llamada_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_evaluaciones_comportamiento
        FOREIGN KEY (comportamiento_id)
        REFERENCES comportamientos(comportamiento_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_resultados_comportamiento (
    sesion_id BIGINT UNSIGNED NOT NULL,
    comportamiento_id SMALLINT UNSIGNED NOT NULL,
    cumplio_final BOOLEAN NOT NULL,
    PRIMARY KEY (sesion_id, comportamiento_id),
    CONSTRAINT fk_resultados_comportamiento_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_resultados_comportamiento_catalogo
        FOREIGN KEY (comportamiento_id)
        REFERENCES comportamientos(comportamiento_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_kpis (
    sesion_id BIGINT UNSIGNED NOT NULL,
    kpi_id TINYINT UNSIGNED NOT NULL,
    resultado_mtd DECIMAL(12, 4) NOT NULL,
    meta_coaching_anterior DECIMAL(12, 4) NULL,
    resultado_actual DECIMAL(12, 4) NOT NULL,
    hubo_mejora BOOLEAN NULL,
    meta_siguiente_semana DECIMAL(12, 4) NOT NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT fk_coaching_kpi_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_coaching_kpi_catalogo
        FOREIGN KEY (kpi_id) REFERENCES kpis(kpi_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_compromisos (
    sesion_id BIGINT UNSIGNED NOT NULL,
    coach_que TEXT NOT NULL,
    coach_como TEXT NOT NULL,
    coach_cuando TEXT NOT NULL,
    coach_reconocimiento TEXT NOT NULL,
    agente_que TEXT NOT NULL,
    agente_como TEXT NOT NULL,
    agente_cuando TEXT NOT NULL,
    agente_evaluacion TEXT NOT NULL,
    agente_reconocimiento TEXT NOT NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT fk_coaching_compromisos_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_rca (
    sesion_id BIGINT UNSIGNED NOT NULL,
    actividad_toolkit VARCHAR(180) NOT NULL,
    cierre_comportamiento BOOLEAN NOT NULL DEFAULT FALSE,
    llamadas_con_comportamiento VARCHAR(100) NOT NULL,
    tendencia_tres_semanas VARCHAR(180) NOT NULL,
    motivo_no_realizo TEXT NOT NULL,
    actividad_superar_obstaculo TEXT NOT NULL,
    motivo_continuar TEXT NOT NULL,
    resultado_roleplay TEXT NOT NULL,
    attainment_actual VARCHAR(120) NOT NULL,
    cambio_kpi TEXT NOT NULL,
    cambio_comportamiento TEXT NOT NULL,
    PRIMARY KEY (sesion_id),
    CONSTRAINT fk_coaching_rca_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coaching_adjuntos (
    adjunto_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sesion_id BIGINT UNSIGNED NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(255) NOT NULL,
    ruta_almacenamiento VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT UNSIGNED NOT NULL,
    subido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (adjunto_id),
    INDEX idx_coaching_adjuntos_sesion (sesion_id),
    CONSTRAINT fk_coaching_adjuntos_sesion
        FOREIGN KEY (sesion_id) REFERENCES sesiones(sesion_id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- 7. DATOS INICIALES DE LOS CATALOGOS
-- =========================================================

START TRANSACTION;

INSERT INTO roles (rol_id, nombre, nivel) VALUES
    (1, 'Director', 1),
    (2, 'Senior Account Manager', 2),
    (3, 'Account Manager', 3),
    (4, 'Manager', 4),
    (5, 'Coach', 5),
    (6, 'Agente', 6)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    nivel = VALUES(nivel);

INSERT INTO tipos_sesion (tipo_sesion_id, codigo, nombre) VALUES
    (1, 'COACHING', 'Coaching'),
    (2, 'ITGF', 'ITGF'),
    (3, 'ACCOUNTABILITY', 'Accountability'),
    (4, 'VERBAL_WARNING', 'Verbal Warning')
ON DUPLICATE KEY UPDATE
    codigo = VALUES(codigo),
    nombre = VALUES(nombre);

INSERT INTO estados_sesion (estado_sesion_id, codigo, nombre) VALUES
    (1, 'BORRADOR', 'Borrador'),
    (2, 'EN_PROGRESO', 'En progreso'),
    (3, 'COMPLETADA', 'Completada'),
    (4, 'CANCELADA', 'Cancelada')
ON DUPLICATE KEY UPDATE
    codigo = VALUES(codigo),
    nombre = VALUES(nombre);

INSERT INTO tipos_seguimiento (tipo_seguimiento_id, nombre) VALUES
    (1, 'Constructivo'),
    (2, 'Correctivo'),
    (3, 'Preventivo')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre);

INSERT INTO comportamientos
    (comportamiento_id, clave, nombre, orden) VALUES
    (1, 'properGreeting', 'Buen saludo', 1),
    (2, 'accountVerification', 'Verificación de la cuenta', 2),
    (3, 'paraphraseNeed', 'Parafrasear la necesidad del cliente', 3),
    (4, 'ensureHelp', 'Asegurar ayuda', 4),
    (5, 'verbalizeAudit', 'Verbalizar la auditoría visual', 5),
    (6, 'relevantQuestions', 'Preguntas de sondeo relevantes', 6),
    (7, 'toolsUsage', 'Uso de herramientas', 7),
    (8, 'resolution', 'Resolución', 8),
    (9, 'documentation', 'Dejar documentación dentro de la cuenta', 9),
    (10, 'selfHelpPromotion', 'Promover opciones de autoayuda', 10),
    (11, 'recapitulation', 'Recapitulación', 11),
    (12, 'offerProducts', 'Ofrecer productos o servicios adecuados', 12),
    (13, 'adjacentProblems', 'Preguntar por problemas adyacentes', 13),
    (14, 'thankCustomer', 'Agradecer al cliente y cerrar la llamada', 14)
ON DUPLICATE KEY UPDATE
    clave = VALUES(clave),
    nombre = VALUES(nombre),
    orden = VALUES(orden);

INSERT INTO categorias_call_driver
    (categoria_call_driver_id, nombre, orden) VALUES
    (1, 'Facturación y pagos', 1),
    (2, 'Soporte técnico', 2),
    (3, 'Retención y gestión de cuenta', 3),
    (4, 'Ventas y mejoras', 4),
    (5, 'Logística e información', 5)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    orden = VALUES(orden);

INSERT INTO call_drivers
    (call_driver_id, categoria_call_driver_id, nombre, orden) VALUES
    (1, 1, 'Cobros no reconocidos / Factura alta', 1),
    (2, 1, 'Acuerdos de pago', 2),
    (3, 1, 'Pagos rechazados o no aplicados', 3),
    (4, 1, 'Consulta de saldo / Estado de cuenta', 4),
    (5, 1, 'Ajustes de factura', 5),
    (6, 2, 'Sin servicio', 1),
    (7, 2, 'Reseteo de credenciales', 2),
    (8, 2, 'Troubleshooting / Configuración', 3),
    (9, 2, 'Problemas de conectividad', 4),
    (10, 2, 'Problemas con el equipo', 5),
    (11, 3, 'Cancelación de servicio', 1),
    (12, 3, 'Cambio de titularidad', 2),
    (13, 3, 'Cambio de domicilio', 3),
    (14, 3, 'Suspensión temporal de servicio', 4),
    (15, 3, 'Reactivación de cuenta', 5),
    (16, 4, 'Upgrade de equipo / plan', 1),
    (17, 4, 'Agregar líneas', 2),
    (18, 4, 'Consulta de promociones', 3),
    (19, 4, 'Contratación de servicios adicionales', 4),
    (20, 4, 'Cambio de plan', 5),
    (21, 5, 'WISMO', 1),
    (22, 5, 'Garantías / Devoluciones', 2),
    (23, 5, 'Consulta general de servicios', 3),
    (24, 5, 'Seguimiento de orden', 4),
    (25, 5, 'Información de cuenta', 5)
ON DUPLICATE KEY UPDATE
    categoria_call_driver_id = VALUES(categoria_call_driver_id),
    nombre = VALUES(nombre),
    orden = VALUES(orden);

INSERT INTO kpis (kpi_id, codigo, nombre) VALUES
    (1, 'NPS', 'NPS'),
    (2, 'CRT', 'CRT'),
    (3, 'FCR', 'FCR'),
    (4, 'STAY_CONNECTED', 'Stay Connected'),
    (5, 'AAL_100', 'AAL/100')
ON DUPLICATE KEY UPDATE
    codigo = VALUES(codigo),
    nombre = VALUES(nombre);

-- =========================================================
-- 8. DATOS DE PRUEBA PARA LA JERARQUIA
-- =========================================================

INSERT INTO usuarios
    (employee_id, nombre, correo, password_hash, rol_id, supervisor_id) VALUES
    ('DIR001', 'Carolina Mendoza', 'carolina.mendoza@smartcoach.com', NULL, 1, NULL)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    correo = VALUES(correo),
    rol_id = VALUES(rol_id),
    supervisor_id = VALUES(supervisor_id);

INSERT INTO usuarios
    (employee_id, nombre, correo, password_hash, rol_id, supervisor_id) VALUES
    ('SAM001', 'Andrés Salazar', 'andres.salazar@smartcoach.com', NULL, 2, 'DIR001'),
    ('AM001', 'Natalia Herrera', 'natalia.herrera@smartcoach.com', NULL, 3, 'SAM001'),
    ('MGR001', 'Carlos Ramírez', 'carlos.ramirez@smartcoach.com', NULL, 4, 'AM001'),
    ('COACH001', 'Jessyka Najar', 'jessyka.najar@smartcoach.com', NULL, 5, 'MGR001'),
    ('COACH002', 'Mateo López', 'mateo.lopez@smartcoach.com', NULL, 5, 'MGR001'),
    ('TM001', 'Laura Gómez', 'laura.gomez@smartcoach.com', NULL, 6, 'COACH001'),
    ('TM002', 'Juan Pérez', 'juan.perez@smartcoach.com', NULL, 6, 'COACH001'),
    ('TM003', 'Daniela Ruiz', 'daniela.ruiz@smartcoach.com', NULL, 6, 'COACH001'),
    ('TM004', 'Andres Torres', 'andres.torres@smartcoach.com', NULL, 6, 'COACH001'),
    ('TM005', 'Camila Rodriguez', 'camila.rodriguez@smartcoach.com', NULL, 6, 'COACH001'),
    ('TM006', 'Valentina Rojas', 'valentina.rojas@smartcoach.com', NULL, 6, 'COACH002')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    correo = VALUES(correo),
    rol_id = VALUES(rol_id),
    supervisor_id = VALUES(supervisor_id);

COMMIT;

-- La base ya queda preparada para conectar Express.
-- El backend validara que cada usuario tenga el rol correcto,
-- que la jerarquia no forme ciclos y que los resultados automaticos
-- no puedan ser alterados por el navegador.
