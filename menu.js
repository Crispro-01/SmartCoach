document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.querySelector(".dashboard");
    const botonMenu = document.querySelector(".boton-menu");

    if (!dashboard || !botonMenu) {
        return;
    }

    botonMenu.addEventListener("click", function () {
        const menuEstaColapsado = dashboard.classList.toggle("menu-colapsado");

        botonMenu.setAttribute("aria-expanded", String(!menuEstaColapsado));
        botonMenu.setAttribute(
            "aria-label",
            menuEstaColapsado ? "Expandir menú" : "Contraer menú"
        );
    });
});
