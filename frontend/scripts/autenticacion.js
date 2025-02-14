const API_URL = "http://localhost:5000/api"; // URL del backend

document.getElementById("form-login").addEventListener("submit", async (e)=>{
    e.preventDefault(); // Evitar que la página se recargue

    const email = document.getElementById("email").value.trim();
    const contraseña = document.getElementById("contraseña").value.trim();
    const errorMensaje = document.getElementById("error-mensaje");

    // Verificar que los campos no estén vacíos
    if (!email || !contraseña){
        errorMensaje.textContent = "Todos los campos son obligatorios.";
        return;
    }

    try{
        const respuesta=await fetch(`${API_URL}/login`,{
            method: "POST",
            headers:{
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, contraseña }),
        });

        console.log("Código de respuesta:", respuesta.status); // Depuración

        const datos = await respuesta.json();
        console.log("Respuesta del servidor:", datos); // Verificar la respuesta

        if (!respuesta.ok){
            errorMensaje.textContent = datos.mensaje || "Error en el inicio de sesión.";
            return;
        }

        if (!datos.token){
            errorMensaje.textContent = "No se recibió un token. Verifica el backend.";
            return;
        }

        // Guardar token en localStorage
        localStorage.setItem("token", datos.token);
        console.log("Token guardado:", localStorage.getItem("token")); // Verificar que el token se guarda

        // Redirigir al tablero
        window.location.href = "tablero.html";

    } catch (error) {
        errorMensaje.textContent = "Error al conectar con el servidor.";
        console.error("Error en login:", error);
    }
});
