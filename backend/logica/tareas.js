const mongoose = require("mongoose");

const tareaSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    descripcion: { type: String, default: "" }, 
    columna: { type: String, enum: ["idea", "todo", "doing", "done"], required: true },
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    usuariosAsignados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }] // 🔥 Usuarios con acceso solo de lectura
});

const Tarea = mongoose.model("Tarea", tareaSchema);
module.exports = Tarea;
