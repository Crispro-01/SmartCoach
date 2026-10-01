const formularioLogin = document.getElementById("formularioLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const URL_API_AUTH = `http://${window.location.hostname}:3000/api/auth`;

formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    iniciarSesion();
});

async function iniciarSesion() {
    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value;
    const boton = formularioLogin.querySelector("button[type='submit']");

    boton.disabled = true;
    mensajeLogin.textContent = "Verificando acceso…";
    mensajeLogin.className = "";

    try {
        const respuesta = await fetch(`${URL_API_AUTH}/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, contrasena })
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.mensaje || "No fue posible iniciar sesión.");
        }

        mensajeLogin.textContent = `Bienvenido, ${resultado.datos.nombre}.`;
        mensajeLogin.className = "mensaje-exito";
        document.getElementById("contrasena").value = "";
        window.location.href = "dashboard.html";
    } catch (error) {
        mensajeLogin.textContent = error instanceof TypeError
            ? "No se pudo conectar con el servidor. Comprueba que el backend esté iniciado."
            : error.message;
        mensajeLogin.className = "mensaje-error";
        document.getElementById("contrasena").value = "";
    } finally {
        boton.disabled = false;
    }
}
