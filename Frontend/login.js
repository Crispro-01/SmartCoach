const formularioLogin = document.getElementById("formularioLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

formularioLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    const boton = formularioLogin.querySelector("button[type='submit']");
    boton.disabled = true;
    mensajeLogin.textContent = "Verificando acceso...";
    mensajeLogin.className = "";

    try {
        const respuesta = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                correo: document.getElementById("correo").value,
                contrasena: document.getElementById("contrasena").value
            })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo iniciar sesión.");
        window.location.href = "dashboard.html";
    } catch (error) {
        mensajeLogin.textContent = error.message;
        mensajeLogin.className = "mensaje-error";
    } finally {
        document.getElementById("contrasena").value = "";
        boton.disabled = false;
    }
});
