const express = require("express");
const cors = require("cors");
const exerciseRoutes = require("./routes/exerciseRoutes");
const routineRoutes = require("./routes/routineRoutes");
const seriesRoutes = require("./routes/seriesRoutes");

const app = express();

// Configure CORS
app.use(
	cors({
		origin: "https://gym-tracker-frontend.vercel.app", // Replace with your frontend URL
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		credentials: true,
	})
);

app.use(express.json());

app.use("/api/exercises", exerciseRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/series", seriesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
