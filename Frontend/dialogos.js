(function () {
    function mostrarDialogo(mensaje, esConfirmacion) {
        return new Promise(function (resolver) {
            const dialogo = document.createElement("dialog");
            dialogo.className = "dialogo-smartcoach";
            dialogo.setAttribute("aria-labelledby", "tituloDialogoSmartCoach");

            const encabezado = document.createElement("h2");
            encabezado.id = "tituloDialogoSmartCoach";
            encabezado.textContent = "SmartCoach dice:";

            const texto = document.createElement("p");
            texto.textContent = String(mensaje);

            const acciones = document.createElement("div");
            acciones.className = "acciones-dialogo-smartcoach";

            let finalizado = false;
            function cerrar(resultado) {
                if (finalizado) return;
                finalizado = true;
                dialogo.close();
                dialogo.remove();
                resolver(resultado);
            }

            if (esConfirmacion) {
                const cancelar = document.createElement("button");
                cancelar.type = "button";
                cancelar.className = "boton-secundario";
                cancelar.textContent = "Cancelar";
                cancelar.addEventListener("click", function () { cerrar(false); });
                acciones.append(cancelar);
            }

            const aceptar = document.createElement("button");
            aceptar.type = "button";
            aceptar.className = "boton-principal";
            aceptar.textContent = "Aceptar";
            aceptar.addEventListener("click", function () { cerrar(true); });
            acciones.append(aceptar);

            dialogo.addEventListener("cancel", function (evento) {
                evento.preventDefault();
                cerrar(false);
            });

            dialogo.append(encabezado, texto, acciones);
            document.body.append(dialogo);
            dialogo.showModal();
            aceptar.focus();
        });
    }

    window.smartCoachAlert = function (mensaje) {
        return mostrarDialogo(mensaje, false).then(function () {});
    };

    window.smartCoachConfirm = function (mensaje) {
        return mostrarDialogo(mensaje, true);
    };
})();
