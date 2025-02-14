const express = require("express");
const Usuario = require("../logica/usuarios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

        // Crear token JWT
        const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, "secreto", { expiresIn: "1h" });

        console.log("✅ Token generado:", token); // 🔍 Verificar el token en la consola

        res.json({ mensaje: "Login exitoso", token });
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});


//middleware para validar token JWT
const autenticarUsuario = (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        console.log("❌ No se proporcionó un token.");
        return res.status(401).json({ mensaje: "Acceso denegado, token no proporcionado" });
    }

    try {
        token = token.replace("Bearer ", "");
        console.log("🔍 Token recibido:", token);

        const verificado = jwt.verify(token, "secreto"); // Asegurar que la clave es la correcta
        req.usuario = verificado;
        console.log("✅ Token verificado:", verificado);
        next();
    } catch (error) {
        console.log("❌ Token inválido o expirado:", error.message);
        return res.status(401).json({ mensaje: "Token inválido o expirado" });
    }
};

//obtener todas las tareas del usuario
router.get("/tareas", autenticarUsuario, async (req, res)=>{
    try{
        let tareas;

        if (req.usuario.rol==="admin"){
            tareas=await Tarea.find(); 
        } else{
            tareas=await Tarea.find({
                $or:[
                    { propietario: req.usuario.id},
                    { usuariosAsignados: req.usuario.id} 
                ]
            });
        }

        res.json(tareas);
    } catch (error){
        console.error("Error al obtener tareas:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});


//crear una nueva tarea
router.post("/tareas", autenticarUsuario, async (req, res) => {
    const { texto, descripcion, columna, usuariosAsignados } = req.body;

    try {
        if (!req.usuario || !req.usuario.id) {
            return res.status(401).json({ mensaje: "Usuario no autenticado" });
        }

        //verificar si se proporcionaron usuarios y convertirlos a ObjectId
        let colaboradores = [];
        if (usuariosAsignados && usuariosAsignados.length > 0) {
            colaboradores = await Usuario.find({ _id: { $in: usuariosAsignados } }).select("_id");
        }

        const nuevaTarea = new Tarea({
            texto,
            descripcion,
            columna,
            propietario: req.usuario.id,
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
router.put("/tareas/:id", autenticarUsuario, async (req, res)=>{
    const {columna}=req.body;

    try{
        let tarea;

        //verificar si el usuario es admin (puede modificar cualquier tarea)
        if (req.usuario.rol === "admin"){
            tarea = await Tarea.findById(req.params.id);
        } else{
            //permitir que el propietario modifique su tarea, pero bloquear a los asignados
            tarea = await Tarea.findOne({ 
                _id: req.params.id,
                $or: [{ propietario: req.usuario.id }, { usuariosAsignados: req.usuario.id }] 
            });

            //si el usuario no es el propietario, bloquear la modificación
            if (tarea && tarea.propietario.toString() !== req.usuario.id){
                return res.status(403).json({ mensaje: "No puedes modificar esta tarea, solo puedes verla." });
            }
        }

        if (!tarea) {
            return res.status(404).json({ mensaje: "Tarea no encontrada o no tienes permiso para modificarla" });
        }

        //verificar si el movimiento es válido
        if (!movimientosPermitidos[tarea.columna].includes(columna)){
            return res.status(400).json({ mensaje: `No puedes mover la tarea de "${tarea.columna}" a "${columna}"` });
        }

        //si el movimiento es válido, actualizar la tarea
        tarea.columna = columna;
        await tarea.save();

        res.json(tarea);
    } catch (error) {
        console.error("Error al actualizar tarea:", error);
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

//eliminar una tarea
router.delete("/tareas/:id", autenticarUsuario, async (req, res)=>{
    try{
        const tarea = await Tarea.findByIdAndDelete(req.params.id);

        if (!tarea) return res.status(404).json({ mensaje: "Tarea no encontrada" });

        res.json({ mensaje: "Tarea eliminada con éxito" });
    } catch (error){
        res.status(500).json({ mensaje: "Error en el servidor", error });
    }
});

module.exports = router;
