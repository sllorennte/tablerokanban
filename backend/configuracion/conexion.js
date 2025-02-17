const mongoose=require("mongoose");

const conectarDB=async ()=>{
    try {
        await mongoose.connect("mongodb://localhost:27017/kanban");
        console.log("Conectado a MongoDB correctamente.");
    } catch (error) {
        console.error("Error al conectar a MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports=conectarDB;
