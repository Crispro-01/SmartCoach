document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.querySelector(".dashboard");
    const botonMenu = document.querySelector(".boton-menu");

    if (!dashboard || !botonMenu) {
        return;
    }

    dashboard.style.visibility = "hidden";
    fetch("/api/auth/me", { credentials: "same-origin" })
        .then(function (respuesta) {
            if (respuesta.status === 401 || respuesta.status === 403) {
                window.location.href = "index.html";
                return null;
            }
            if (!respuesta.ok) throw new Error("No se pudo comprobar la sesión.");
            return respuesta.json();
        })
        .then(function (resultado) {
            if (!resultado) return;
            const rolesPermitidos = (dashboard.dataset.rolesPermitidos || "Coach").split(",");
            if (!rolesPermitidos.includes(resultado.datos.rol)) {
                window.location.href = resultado.datos.rol === "Manager"
                    ? "revision-solicitudes.html" : "dashboard.html";
                return;
            }
            for (const enlace of document.querySelectorAll(".navegacion-menu [data-rol-visible]")) {
                enlace.hidden = enlace.dataset.rolVisible !== resultado.datos.rol;
            }
            const nombreUsuario = document.getElementById("nombreCoach") || document.getElementById("nombreUsuario");
            if (nombreUsuario) nombreUsuario.textContent = resultado.datos.nombre;
            dashboard.style.visibility = "visible";
        })
        .catch(function () {
            dashboard.style.visibility = "visible";
            window.alert("No se pudo comprobar tu acceso. Revisa que Smart Coach esté iniciado.");
        });

    const cerrarSesion = Array.from(document.querySelectorAll(".navegacion-menu a"))
        .find(function (enlace) { return enlace.textContent.trim() === "Cerrar sesión"; });
    if (cerrarSesion) cerrarSesion.addEventListener("click", async function (evento) {
        evento.preventDefault();
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } finally {
            window.location.href = "index.html";
        }
    });

    botonMenu.addEventListener("click", function () {
        const menuEstaColapsado = dashboard.classList.toggle("menu-colapsado");

        botonMenu.setAttribute("aria-expanded", String(!menuEstaColapsado));
        botonMenu.setAttribute(
            "aria-label",
            menuEstaColapsado ? "Expandir menú" : "Contraer menú"
        );
    });
});
