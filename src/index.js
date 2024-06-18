const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const exerciseRoutes = require("./routes/exerciseRoutes");
const routineRoutes = require("./routes/routineRoutes");
const seriesRoutes = require("./routes/seriesRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Configurar CORS
app.use(bodyParser.json());

app.use("/api/exercises", exerciseRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/series", seriesRoutes);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
