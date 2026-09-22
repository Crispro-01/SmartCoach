import "dotenv/config";

function convertirNumero(valor, valorPorDefecto) {
    const numero = Number.parseInt(valor ?? "", 10);
    return Number.isNaN(numero) ? valorPorDefecto : numero;
}

export const configuracion = Object.freeze({
    puerto: convertirNumero(process.env.PORT, 3000),
    baseDatos: Object.freeze({
        host: process.env.DB_HOST ?? "localhost",
        port: convertirNumero(process.env.DB_PORT, 3306),
        database: process.env.DB_NAME ?? "smart_coach",
        user: process.env.DB_USER ?? "",
        password: process.env.DB_PASSWORD ?? ""
    })
});
