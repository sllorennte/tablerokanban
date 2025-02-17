const API_URL = "http://localhost:5000/api";
const usuario = JSON.parse(localStorage.getItem("usuario"));

document.addEventListener("DOMContentLoaded", ()=>{
    if (!usuario){
        window.location.href = "login.html";
    }
});

document.getElementById("cerrar-sesion").addEventListener("click", ()=>{
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
});

document.addEventListener("DOMContentLoaded", async ()=>{
    const botonesNuevaTarea = document.querySelectorAll(".nueva-tarea");
    const columnas=document.querySelectorAll(".contenedor-tareas");

    await cargarTareas();

    botonesNuevaTarea.forEach(boton=>{
        boton.addEventListener("click", async ()=>{
            const columna = boton.getAttribute("data-columna");
            const nuevaTarea = prompt("Escribe la nueva tarea:");

            if (nuevaTarea) {
                await crearTarea(columna, nuevaTarea);
                await cargarTareas();
            }
        });
    });

    columnas.forEach(columna=>{
        columna.addEventListener("dragover", (e)=>e.preventDefault());
        columna.addEventListener("drop", async (e)=>{
            e.preventDefault();
            const idTarea=e.dataTransfer.getData("text/plain");
            const tareaElemento=document.getElementById(idTarea);

            if (tareaElemento){
                const nuevaColumna=columna.id.replace("lista-", "");
                const columnaOriginal=tareaElemento.getAttribute("data-columna");
                const movimientoExitoso=await actualizarTarea(idTarea, nuevaColumna, tareaElemento);

                if (movimientoExitoso){
                    tareaElemento.setAttribute("data-columna", nuevaColumna);
                    columna.appendChild(tareaElemento);
                } else {
                    document.getElementById(`lista-${columnaOriginal}`).appendChild(tareaElemento);
                }
            }
        });
    });
});

async function cargarTareas(){
    try {
        const respuesta = await fetch(`${API_URL}/tareas`);

        if (!respuesta.ok){
            console.error("Error al obtener tareas:", respuesta.statusText);
            return;
        }

        const tareas = await respuesta.json();
        document.querySelectorAll(".contenedor-tareas").forEach(col => col.innerHTML = "");

        tareas.forEach(tarea => agregarTarea(
            tarea.columna,
            tarea.texto,
            tarea._id,
            tarea.descripcion,
            tarea.usuariosAsignados.map(u => u.email)
        ));
    } catch (error){
        console.error("Error al cargar tareas:", error);
    }
}

function agregarTarea(columna, texto, id, descripcion, usuariosAsignados){
    const contenedor = document.getElementById(`lista-${columna}`);
    const tarea = document.createElement("div");

    tarea.classList.add("tarea");
    tarea.textContent = texto;
    tarea.setAttribute("draggable", "true");
    tarea.setAttribute("data-columna", columna);
    tarea.id = id;

    const descripcionElemento = document.createElement("p");
    descripcionElemento.textContent = descripcion ? `${descripcion}` : "Sin descripción";
    tarea.appendChild(descripcionElemento);

    if (usuariosAsignados.length > 0){
        const colaboradoresElemento = document.createElement("p");
        colaboradoresElemento.textContent = `Colaboradores: ${usuariosAsignados.join(", ")}`;
        tarea.appendChild(colaboradoresElemento);
    }

    tarea.addEventListener("dragstart", (e)=>{
        e.dataTransfer.setData("text/plain", tarea.id);
    });

    const botonEliminar = document.createElement("button");
    botonEliminar.textContent = "X";
    botonEliminar.classList.add("eliminar-tarea");
    botonEliminar.addEventListener("click", async ()=>{
        await eliminarTarea(id);
        tarea.remove();
    });

    tarea.appendChild(botonEliminar);
    contenedor.appendChild(tarea);
}

async function crearTarea(columna, texto){
    try {
        const descripcion=prompt("Escribe la descripción de la tarea:");

        if (!usuario){
            alert("No estás autenticado. Por favor, inicia sesión.");
            window.location.href = "login.html";
            return;
        }

        mostrarModalColaboradores(async (usuariosAsignados)=>{
            const respuesta = await fetch(`${API_URL}/tareas`,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ texto, descripcion, columna, usuariosAsignados }),
            });

            const datos=await respuesta.json();

            if (!respuesta.ok){
                console.error("Error al crear tarea:", datos.mensaje);
                alert(`Error: ${datos.mensaje}`);
            } else {
                await cargarTareas();
            }
        });

    } catch (error){
        console.error("Error al crear tarea:", error);
    }
}

async function actualizarTarea(id, nuevaColumna, tareaElemento){
    try{
        const respuesta = await fetch(`${API_URL}/tareas/${id}`,{
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ columna: nuevaColumna }),
        });

        const datos=await respuesta.json();

        if (!respuesta.ok){
            alert(`No puedes mover la tarea: ${datos.mensaje}`);
            return false;
        }

        return true;
    } catch (error){
        console.error("Error al actualizar tarea:", error);
        return false;
    }
}

async function eliminarTarea(id){
    try{
        const respuesta = await fetch(`${API_URL}/tareas/${id}`,{
            method: "DELETE",
        });
        if (!respuesta.ok){
            console.error("Error al eliminar tarea:", respuesta.statusText);
        }
    } catch (error){
        console.error("Error al eliminar tarea:", error);
    }
}
