import { pool } from "../config/database.js";

export async function obtenerCatalogosCoaching(solicitud, respuesta) {
    try {
        const [
            [comportamientos],
            [callDrivers],
            [kpis],
            [tiposSeguimiento]
        ] = await Promise.all([
            pool.execute(
                `SELECT comportamiento_id AS id, clave, nombre
                FROM comportamientos
                WHERE activo = TRUE
                ORDER BY orden`
            ),
            pool.execute(
                `SELECT
                    categoria.categoria_call_driver_id AS categoriaId,
                    categoria.nombre AS categoria,
                    driver.call_driver_id AS id,
                    driver.nombre,
                    driver.orden
                FROM categorias_call_driver AS categoria
                INNER JOIN call_drivers AS driver
                    ON driver.categoria_call_driver_id = categoria.categoria_call_driver_id
                WHERE categoria.activo = TRUE
                    AND driver.activo = TRUE
                ORDER BY categoria.orden, driver.orden`
            ),
            pool.execute(
                `SELECT kpi_id AS id, codigo, nombre
                FROM kpis
                WHERE activo = TRUE
                ORDER BY kpi_id`
            ),
            pool.execute(
                `SELECT tipo_seguimiento_id AS id, nombre
                FROM tipos_seguimiento
                ORDER BY tipo_seguimiento_id`
            )
        ]);

        const categoriasPorId = new Map();

        for (const fila of callDrivers) {
            let categoria = categoriasPorId.get(fila.categoriaId);

            if (!categoria) {
                categoria = {
                    id: fila.categoriaId,
                    nombre: fila.categoria,
                    opciones: []
                };
                categoriasPorId.set(fila.categoriaId, categoria);
            }

            categoria.opciones.push({
                id: fila.id,
                nombre: fila.nombre
            });
        }

        return respuesta.json({
            estado: "ok",
            datos: {
                comportamientos,
                categoriasCallDriver: Array.from(categoriasPorId.values()),
                kpis,
                tiposSeguimiento
            }
        });
    } catch (error) {
        console.error("Error al consultar catálogos de Coaching:", error.message);

        return respuesta.status(500).json({
            estado: "error",
            mensaje: "No se pudieron consultar los catálogos de Coaching"
        });
    }
}
