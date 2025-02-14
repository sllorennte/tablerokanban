const express = require("express");
const conectarDB = require("./configuracion/conexion");
const cors = require("cors");
const rutasAPI = require("./rutas/api");
const app = express();
conectarDB();

app.use(express.json());
app.use(cors());

app.use("/api", rutasAPI);

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
