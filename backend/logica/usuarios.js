const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contraseña: { type: String, required: true },
    rol: { type: String, enum: ["admin", "usuario"], default: "usuario" }, //permite roles
});

//antes de guardar, encriptar la contraseña
usuarioSchema.pre("save", async function (next){
    if (!this.isModified("contraseña")) return next();
    this.contraseña=await bcrypt.hash(this.contraseña, 10);
    next();
});

const Usuario=mongoose.model("Usuario", usuarioSchema);
module.exports=Usuario;
