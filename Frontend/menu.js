const URL_API_AUTH = `http://${window.location.hostname}:3000/api/auth`;

document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.querySelector(".dashboard");
    const botonMenu = document.querySelector(".boton-menu");

    if (dashboard && botonMenu) {
        botonMenu.addEventListener("click", function () {
            const menuEstaColapsado = dashboard.classList.toggle("menu-colapsado");

            botonMenu.setAttribute("aria-expanded", String(!menuEstaColapsado));
            botonMenu.setAttribute(
                "aria-label",
                menuEstaColapsado ? "Expandir menú" : "Contraer menú"
            );
        });
    }

    const enlaceCerrarSesion = document.querySelector('.navegacion-menu a[href="index.html"]');
    if (enlaceCerrarSesion) {
        enlaceCerrarSesion.addEventListener("click", async function (evento) {
            evento.preventDefault();
            try {
                await fetch(`${URL_API_AUTH}/logout`, {
                    method: "POST",
                    credentials: "include"
                });
            } catch {
                // Aunque el servidor no responda, vuelve a la pantalla de acceso.
            } finally {
                window.location.href = "index.html";
            }
        });
    }

    cargarSesionActual();
});

async function cargarSesionActual() {
    try {
        const respuesta = await fetch(`${URL_API_AUTH}/sesion`, {
            credentials: "include"
        });

        if (respuesta.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (!respuesta.ok) return;

        const resultado = await respuesta.json();
        const nombre = document.getElementById("nombreUsuarioDashboard");
        const rol = document.getElementById("rolUsuarioDashboard");
        if (nombre) nombre.textContent = resultado.datos.nombre;
        if (rol) rol.textContent = resultado.datos.rol;
    } catch {
        // La pantalla puede explicar el problema mediante la respuesta de la API.
    }
}
