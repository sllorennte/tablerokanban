const API_URL = "http://localhost:5000/api"; //URL del backend
const token = localStorage.getItem("token"); //obtener token guardado

//verificar si el usuario está autenticado
document.addEventListener("DOMContentLoaded", ()=>{
    if (!token){
        window.location.href = "login.html"; //redirigir si no hay sesión
    }
});

//cerrar sesión
document.getElementById("cerrar-sesion").addEventListener("click", ()=>{
    localStorage.removeItem("token"); //eliminar token
    window.location.href = "login.html"; //redirigir al login
});

//cargar las tareas al iniciar la página
document.addEventListener("DOMContentLoaded", async ()=>{
    const botonesNuevaTarea = document.querySelectorAll(".nueva-tarea");
    const columnas=document.querySelectorAll(".contenedor-tareas");

    await cargarTareas();

    //evento para crear nueva tarea
    botonesNuevaTarea.forEach(boton=>{
        boton.addEventListener("click", async ()=>{
            const columna = boton.getAttribute("data-columna");
            const nuevaTarea = prompt("Escribe la nueva tarea:");

            if (nuevaTarea) {
                await crearTarea(columna, nuevaTarea);
                await cargarTareas(); //recargar la lista de tareas
            }
        });
    });

    //habilitar arrastrar y soltar
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

//función para cargar tareas desde el backend
async function cargarTareas(){
    try {
        const respuesta = await fetch(`${API_URL}/tareas`,{
            headers: { Authorization: `Bearer ${token}` },
        });

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
            tarea.usuariosAsignados.map(u => u.email) //obtener emails en lugar de IDs
        ));
    } catch (error){
        console.error("Error al cargar tareas:", error);
    }
}

//funcion para agregar tarea al DOM
function agregarTarea(columna, texto, id, descripcion, usuariosAsignados){
    const contenedor = document.getElementById(`lista-${columna}`);
    const tarea = document.createElement("div");

    tarea.classList.add("tarea");
    tarea.textContent = texto;
    tarea.setAttribute("draggable", "true");
    tarea.setAttribute("data-columna", columna);
    tarea.id = id;

    //agregar descripción
    const descripcionElemento = document.createElement("p");
    descripcionElemento.textContent = descripcion ? `📌 ${descripcion}` : "📌 Sin descripción";
    tarea.appendChild(descripcionElemento);

    //mostrar colaboradores
    if (usuariosAsignados.length > 0){
        const colaboradoresElemento = document.createElement("p");
        colaboradoresElemento.textContent = `👥 Colaboradores: ${usuariosAsignados.join(", ")}`;
        tarea.appendChild(colaboradoresElemento);
    }

    //eventos Drag & Drop
    tarea.addEventListener("dragstart", (e)=>{
        e.dataTransfer.setData("text/plain", tarea.id);
    });

    //boton para eliminar tarea
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

//función para crear nueva tarea en el backend
async function crearTarea(columna, texto){
    try {
        const descripcion=prompt("Escribe la descripción de la tarea:");

        // Obtener el token antes de hacer la petición
        let token=localStorage.getItem("token");

        if (!token){
            alert("No estás autenticado. Por favor, inicia sesión.");
            window.location.href = "login.html";
            return;
        }

        //asegurar que el token se envía correctamente
        token=`Bearer ${token}`;

        //mostrar modal para seleccionar colaboradores
        mostrarModalColaboradores(async (usuariosAsignados)=>{
            const respuesta = await fetch(`${API_URL}/tareas`,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token, 
                },
                body: JSON.stringify({ texto, descripcion, columna, usuariosAsignados }),
            });

            const datos=await respuesta.json();

            if (!respuesta.ok){
                console.error("Error al crear tarea:", datos.mensaje);
                alert(`Error: ${datos.mensaje}`);
            } else {
                await cargarTareas(); //recargar tareas
            }
        });

    } catch (error){
        console.error("Error al crear tarea:", error);
    }
}


//función para actualizar la columna de una tarea en el backend
async function actualizarTarea(id, nuevaColumna, tareaElemento){
    try{
        const respuesta = await fetch(`${API_URL}/tareas/${id}`,{
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
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

//función para eliminar tarea en el backend
async function eliminarTarea(id){
    try{
        const respuesta = await fetch(`${API_URL}/tareas/${id}`,{
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!respuesta.ok){
            console.error("Error al eliminar tarea:", respuesta.statusText);
        }
    } catch (error){
        console.error("Error al eliminar tarea:", error);
    }
}

//función para mostrar el modal de selección de colaboradores
async function mostrarModalColaboradores(callback){
    const modal=document.getElementById("modal-colaboradores");
    const listaUsuarios=document.getElementById("lista-usuarios");
    listaUsuarios.innerHTML="";

    try {
        const respuesta=await fetch(`${API_URL}/usuarios`,{
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const usuarios=await respuesta.json();

        usuarios.forEach(usuario=>{
            const label=document.createElement("label");
            const checkbox=document.createElement("input");
            checkbox.type="checkbox";
            checkbox.value=usuario._id;

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(usuario.email));
            listaUsuarios.appendChild(label);
            listaUsuarios.appendChild(document.createElement("br"));
        });

        modal.style.display="block";

        document.getElementById("confirmar-colaboradores").onclick=()=>{
            const seleccionados = Array.from(listaUsuarios.querySelectorAll("input:checked"))
                                      .map(input => input.value);
            callback(seleccionados);
            modal.style.display = "none";
        };

        document.getElementById("cerrar-modal").onclick = ()=>{
            modal.style.display = "none";
            callback([]);
        };
    } catch (error){
        console.error("Error al obtener usuarios:", error);
    }
}
