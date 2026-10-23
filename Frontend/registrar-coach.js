document.addEventListener("DOMContentLoaded", function () {
    const formulario = document.getElementById("formularioRegistro");
    const boton = document.getElementById("botonRegistrar");
    const mensaje = document.getElementById("mensajeRegistro");

    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        if (!formulario.reportValidity()) return;
        boton.disabled = true;
        mensaje.textContent = "Registrando Coach...";
        const datos = Object.fromEntries(new FormData(formulario));
        try {
            const respuesta = await fetch("/api/auth/registro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(datos)
            });
            const resultado = await respuesta.json();
            if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo registrar el Coach.");
            mensaje.textContent = `${resultado.mensaje} ID: ${resultado.datos.employeeId}.`;
            formulario.reset();
        } catch (error) {
            mensaje.textContent = error.message || "No se pudo conectar con el servidor.";
        } finally {
            boton.disabled = false;
        }
    });
});
