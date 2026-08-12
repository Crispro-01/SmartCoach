const formularioLogin = document.getElementById("formularioLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const correo = document.getElementById("correo").value;
    const contrasena = document.getElementById("contrasena").value;

    console.log("Correo capturado:", correo);
console.log("Contraseña ingresada:", contrasena.length > 0);

if (correo === "admin@smartcoach.com" && contrasena === "Demo1234") {
    mensajeLogin.textContent = "Inicio de sesión correcto.";
    mensajeLogin.className = "mensaje-exito";
    
    window.location.href = "dashboard.html";
} else {
    mensajeLogin.textContent = "Correo o contraseña incorrectos.";
    mensajeLogin.className = "mensaje-error";
}
});
