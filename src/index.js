require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const app = express();
app.use(
	cors({
		origin: [
			"https://gym-tracker-frontend.vercel.app",
			"http://localhost:3000",
		],
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);
app.use(express.json());

const serviceAccountAuth = new JWT({
	email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(
	process.env.SPREADSHEET_ID,
	serviceAccountAuth
);

// Helper function to create a new sheet for an exercise
async function createExerciseSheet(exerciseId, exerciseName) {
	const sheet = await doc.addSheet({
		title: `Exercise_${exerciseId}`,
		headerValues: ["id", "repetitions", "weight", "timestamp"],
	});
	console.log(`Created new sheet for exercise: ${exerciseName}`);
	return sheet;
}

// GET all exercises
app.get("/api/exercises", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Exercises"];
		const rows = await sheet.getRows();

		const exercises = rows.map((row) => ({
			id: row._rawData[0],
			name: row._rawData[1],
			description: row._rawData[2],
			muscleGroup: row._rawData[3],
			set: row._rawData[4],
		}));

		console.log("Fetched exercises:", exercises);
		res.json(exercises);
	} catch (error) {
		console.error("Error fetching exercises:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// POST new exercise
app.post("/api/exercises", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Exercises"];
		const { name, description, muscleGroup } = req.body;

		const id = Date.now().toString();
		const newRow = await sheet.addRow([id, name, description, muscleGroup]);

		// Create a new sheet for this exercise
		await createExerciseSheet(id, name);

		const newExercise = {
			id: newRow._rawData[0],
			name: newRow._rawData[1],
			description: newRow._rawData[2],
			muscleGroup: newRow._rawData[3],
		};

		console.log("New exercise created:", newExercise);
		res.status(201).json(newExercise);
	} catch (error) {
		console.error("Error creating exercise:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// GET single exercise
app.get("/api/exercises/:id", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Exercises"];
		const rows = await sheet.getRows();

		const exercise = rows.find((row) => row._rawData[0] === req.params.id);

		if (!exercise) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		const exerciseData = {
			id: exercise._rawData[0],
			name: exercise._rawData[1],
			description: exercise._rawData[2],
			muscleGroup: exercise._rawData[3],
		};

		console.log("Fetched exercise:", exerciseData);
		res.json(exerciseData);
	} catch (error) {
		console.error("Error fetching exercise:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// DELETE exercise
app.delete("/api/exercises/:id", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Exercises"];
		const rows = await sheet.getRows();

		const rowIndex = rows.findIndex((row) => row._rawData[0] === req.params.id);

		if (rowIndex === -1) {
			console.log("Exercise not found");
			return res.status(404).json({ error: "Exercise not found" });
		}

		await rows[rowIndex].delete();

		// Delete the exercise's sheet
		const exerciseSheet = doc.sheetsByTitle[`Exercise_${req.params.id}`];
		if (exerciseSheet) {
			await exerciseSheet.delete();
		}

		console.log("Exercise and its sheet deleted successfully");
		res.status(200).json({ message: "Exercise deleted successfully" });
	} catch (error) {
		console.error("Error deleting exercise:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// GET sets for a specific exercise
app.get("/api/exercises/:exerciseId/sets", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle[`Exercise_${req.params.exerciseId}`];

		if (!sheet) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		const rows = await sheet.getRows();

		const sets = rows.map((row) => ({
			id: row._rawData[0],
			repetitions: parseInt(row._rawData[1]),
			weight: parseFloat(row._rawData[2]),
			timestamp: row._rawData[3],
		}));

		console.log("Fetched sets:", sets);
		res.json(sets);
	} catch (error) {
		console.error("Error fetching sets:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// POST new set for a specific exercise
app.post("/api/exercises/:exerciseId/sets", async (req, res) => {
	try {
		await doc.loadInfo();
		const exerciseSheet =
			doc.sheetsByTitle[`Exercise_${req.params.exerciseId}`];
		const exercisesSheet = doc.sheetsByTitle["Exercises"];

		if (!exerciseSheet) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		const { repetitions, weight } = req.body;
		const timestamp = new Date().toISOString();

		// Add new set to the exercise-specific sheet
		const newRow = await exerciseSheet.addRow([
			Date.now().toString(), // id
			repetitions.toString(),
			weight.toString(),
			timestamp,
		]);

		const newSet = {
			id: newRow._rawData[0],
			repetitions: parseInt(newRow._rawData[1]),
			weight: parseFloat(newRow._rawData[2]),
			timestamp: newRow._rawData[3],
		};

		// Update the "set" column in the general exercises sheet
		const exerciseRows = await exercisesSheet.getRows();
		const exerciseRow = exerciseRows.find(
			(row) => row._rawData[0] === req.params.exerciseId
		);

		if (exerciseRow) {
			exerciseRow._rawData[4] = `${newSet.repetitions},${newSet.weight},${newSet.timestamp}`;
			console.log("aca", exerciseRow);
			await exerciseRow.save();
			console.log("Exercise 'set' column updated:", exerciseRow.set);
		} else {
			console.log("Exercise not found in the Exercises sheet");
		}

		console.log("New set created and exercise updated:", newSet);
		res.status(201).json(newSet);
	} catch (error) {
		console.error("Error creating set:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// DELETE set
app.delete("/api/exercises/:exerciseId/sets/:setId", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle[`Exercise_${req.params.exerciseId}`];

		if (!sheet) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		const rows = await sheet.getRows();

		const rowIndex = rows.findIndex(
			(row) => row._rawData[0] === req.params.setId
		);

		if (rowIndex === -1) {
			console.log("Set not found");
			return res.status(404).json({ error: "Set not found" });
		}

		await rows[rowIndex].delete();
		console.log("Set deleted successfully");
		res.status(200).json({ message: "Set deleted successfully" });
	} catch (error) {
		console.error("Error deleting set:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
