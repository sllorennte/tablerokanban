const express = require("express");
const Usuario = require("../logica/usuarios");
const bcrypt = require("bcryptjs");
const Tarea = require("../logica/tareas");
const router = express.Router();

//registro de usuario
router.post("/registro", async (req, res)=>{
    const { nombre, email, contraseña, rol}=req.body;

    try{
        //verificar si el usuario ya existe
        const usuarioExistente=await Usuario.findOne({ email });
        if (usuarioExistente){
            return res.status(400).json({ mensaje: "El usuario ya existe" });
        }

        //crear nuevo usuario
        const usuario=new Usuario({ nombre, email, contraseña, rol });
        await usuario.save();

        res.status(201).json({ mensaje: "Usuario registrado con éxito" });
    } catch (error){
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//obtener todos los usuarios 
router.get("/usuarios", async (req, res)=>{
    try {
        const usuarios = await Usuario.find({}, "email _id"); //solo devuelve email y ID
        res.json(usuarios);
    } catch (error){
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//login de usuario
router.post("/login", async (req, res) => {
    const { email, contraseña } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ mensaje: "Usuario no encontrado" });
        }

        const esValida = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!esValida) {
            return res.status(400).json({ mensaje: "Contraseña incorrecta" });
        }
        res.json({ mensaje: "Login exitoso", usuario });
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//obtener todas las tareas del usuario
router.get("/tareas", async (req, res)=>{
    try{
        let tareas;
        tareas=await Tarea.find(); 
        res.json(tareas);
    } catch (error){
        console.error("Error al obtener tareas:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//crear una nueva tarea
router.post("/tareas", async (req, res) => {
    const { texto, descripcion, columna, usuariosAsignados } = req.body;

    try {
        //verificar si se proporcionaron usuarios y convertirlos a ObjectId
        let colaboradores = [];
        if (usuariosAsignados && usuariosAsignados.length > 0) {
            colaboradores = await Usuario.find({ _id: { $in: usuariosAsignados } }).select("_id");
        }

        const nuevaTarea = new Tarea({
            texto,
            descripcion,
            columna,
            usuariosAsignados: colaboradores.map(user => user._id) 
        });

        await nuevaTarea.save();
        res.status(201).json(nuevaTarea);
    } catch (error) {
        console.error("Error al crear tarea:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//definir los movimientos permitidos entre columnas
const movimientosPermitidos = {
    idea: ["todo", "doing"], //puede ir a to do y a doing
    todo: ["doing"], //puede ir a doing
    doing: ["todo", "done"], //puede ir a to do o a done
    done: ["doing", "todo"] //puede ir a doing o a to do
};

//actualizar la columna de una tarea con restricciones
router.put("/tareas/:id", async (req, res)=>{
    const {columna}=req.body;
    try{
        let tarea;
        tarea = await Tarea.findById(req.params.id);
        if (!tarea) {
            return res.status(404).json({ mensaje: "Tarea no encontrada" });
        }
        if (!movimientosPermitidos[tarea.columna].includes(columna)){
            return res.status(400).json({ mensaje: `No puedes mover la tarea de "${tarea.columna}" a "${columna}"` });
        }
        tarea.columna = columna;
        await tarea.save();
        res.json(tarea);
    } catch (error) {
        console.error("Error al actualizar tarea:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//eliminar una tarea
router.delete("/tareas/:id", async (req, res)=>{
    try{
        const tarea = await Tarea.findByIdAndDelete(req.params.id);
        if (!tarea) return res.status(404).json({ mensaje: "Tarea no encontrada" });
        res.json({ mensaje: "Tarea eliminada con éxito" });
    } catch (error){
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

module.exports = router;
