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
			"http://localhost:3001",
			"http://localhost:3000",
		],
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);
app.use(express.json());

const serviceAccountAuth = new JWT({
	email: process.env.GOOGLE_CLIENT_EMAIL,
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
			lastRecordedSet: row._rawData[4],
			totSets: row._rawData[5],
			lastWorkoutReps: row._rawData[6],
			lastWorkoutWeight: row._rawData[7],
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
		const newRow = await sheet.addRow([
			id,
			name,
			description,
			muscleGroup,
			"",
			"",
		]);

		// Create a new sheet for this exercise
		await createExerciseSheet(id, name);

		const newExercise = {
			id: newRow._rawData[0],
			name: newRow._rawData[1],
			description: newRow._rawData[2],
			muscleGroup: newRow._rawData[3],
			lastRecordedSet: newRow._rawData[4],
			totSets: newRow._rawData[5],
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

// PUT update exercise
app.put("/api/exercises/:id", async (req, res) => {
	const exerciseId = req.params.id;
	const updatedExercise = req.body;

	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Exercises"];
		const rows = await sheet.getRows();

		const row = rows.find((row) => row._rawData[0] === exerciseId);
		if (!row) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		row._rawData[1] = updatedExercise.name || row._rawData[1];
		row._rawData[2] = updatedExercise.description || row._rawData[2];
		row._rawData[3] = updatedExercise.muscleGroup || row._rawData[3];
		row._rawData[4] = updatedExercise.sets || row._rawData[4];
		row._rawData[5] = updatedExercise.totSets || row._rawData[5];

		await row.save();

		console.log(`Updated exercise: ${exerciseId}`);
		res.json({ message: "Exercise updated successfully" });
	} catch (error) {
		console.error("Error updating exercise:", error);
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
			lastRecordedSet: exercise._rawData[4],
			totSets: exercise._rawData[5],
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

		const { repetitions, weight, duration } = req.body;
		const timestamp = new Date().toISOString();

		// Add new set to the exercise-specific sheet
		const newRow = await exerciseSheet.addRow([
			Date.now().toString(), // id
			repetitions.toString(),
			weight.toString(),
			timestamp,
			duration.toString(),
		]);

		const newSet = {
			id: newRow._rawData[0],
			repetitions: parseInt(newRow._rawData[1]),
			weight: parseFloat(newRow._rawData[2]),
			timestamp: newRow._rawData[3],
			duration: newRow._rawData[4],
		};

		// Update the "set" column in the general exercises sheet
		const exerciseRows = await exercisesSheet.getRows();
		const exerciseRow = exerciseRows.find(
			(row) => row._rawData[0] === req.params.exerciseId
		);

		if (exerciseRow) {
			exerciseRow._rawData[4] = `${newSet.repetitions},${newSet.weight},${newSet.timestamp},${newSet.duration}`;
			await exerciseRow.save();
			console.log("Exercise 'set' column updated:", exerciseRow._rawData[4]);
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

// GET all routines
app.get("/api/routines", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Routines"];
		const rows = await sheet.getRows();

		const routines = rows.map((row) => ({
			id: row._rawData[0],
			name: row._rawData[1],
			exercises: row._rawData[2] ? row._rawData[2].split(",") : [],
			sets: row._rawData[3],
		}));

		console.log("Fetched routines:", routines);
		res.json(routines);
	} catch (error) {
		console.error("Error fetching routines:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// POST new routine
app.post("/api/routines", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Routines"];
		const { name } = req.body;

		const id = Date.now().toString();
		const newRow = await sheet.addRow([id, name, ""]);

		const newRoutine = {
			id: newRow._rawData[0],
			name: newRow._rawData[1],
			exercises: [],
		};

		console.log("New routine created:", newRoutine);
		res.status(201).json(newRoutine);
	} catch (error) {
		console.error("Error creating routine:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// GET single routine
app.get("/api/routines/:id", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Routines"];
		const rows = await sheet.getRows();

		const routine = rows.find((row) => row._rawData[0] === req.params.id);

		if (!routine) {
			return res.status(404).json({ error: "Routine not found" });
		}

		const routineData = {
			id: routine._rawData[0],
			name: routine._rawData[1],
			exercises: routine._rawData[2] ? routine._rawData[2].split(",") : [],
		};

		console.log("Fetched routine:", routineData);
		res.json(routineData);
	} catch (error) {
		console.error("Error fetching routine:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// PUT update routine (for reordering exercises)
app.put("/api/routines/:id", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Routines"];
		const rows = await sheet.getRows();

		const routineIndex = rows.findIndex(
			(row) => row._rawData[0] === req.params.id
		);

		if (routineIndex === -1) {
			return res.status(404).json({ error: "Routine not found" });
		}

		const { exercises } = req.body;
		const { sets } = req.body;
		console.log("Attempting to update routine exercises:", req.body);
		rows[routineIndex]._rawData[2] = exercises.join(",");
		rows[routineIndex]._rawData[3] = sets.join(",");
		await rows[routineIndex].save();

		const updatedRoutine = {
			id: rows[routineIndex]._rawData[0],
			name: rows[routineIndex]._rawData[1],
			exercises: rows[routineIndex]._rawData[2].split(","),
			totSets: rows[routineIndex]._rawData[3],
		};

		console.log("Updated routine:", updatedRoutine);
		res.json(updatedRoutine);
	} catch (error) {
		console.error("Error updating routine:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// POST add exercise to routine
app.post("/api/routines/:routineId/exercises", async (req, res) => {
	try {
		await doc.loadInfo();
		const routinesSheet = doc.sheetsByTitle["Routines"];
		const exercisesSheet = doc.sheetsByTitle["Exercises"];
		const routineRows = await routinesSheet.getRows();
		const exerciseRows = await exercisesSheet.getRows();

		const routineIndex = routineRows.findIndex(
			(row) => row._rawData[0] === req.params.routineId
		);

		if (routineIndex === -1) {
			return res.status(404).json({ error: "Routine not found" });
		}

		const { exerciseId } = req.body;
		console.log("Attempting to add exercise ID:", exerciseId);

		// Check if the exercise exists
		const exerciseExists = exerciseRows.some(
			(row) => row._rawData[0] === exerciseId
		);
		if (!exerciseExists) {
			console.log("Exercise not found:", exerciseId);
			return res.status(404).json({ error: "Exercise not found" });
		}

		let currentExercises = routineRows[routineIndex]._rawData[2]
			? routineRows[routineIndex]._rawData[2]
					.split(",")
					.filter((id) => id.trim() !== "")
			: [];

		console.log("Current exercises before addition:", currentExercises);

		// Check if the exercise is already in the routine
		if (currentExercises.includes(exerciseId)) {
			console.log("Exercise already in routine:", exerciseId);
			return res.status(400).json({ error: "Exercise already in routine" });
		}

		currentExercises.push(exerciseId);
		console.log("Current exercises after addition:", currentExercises);

		// Update the exercises column
		routineRows[routineIndex]._rawData[2] = currentExercises.join(",");

		// Save the changes
		await routineRows[routineIndex].save();

		const updatedRoutine = {
			id: routineRows[routineIndex]._rawData[0],
			name: routineRows[routineIndex]._rawData[1],
			exercises: routineRows[routineIndex]._rawData[2].split(","),
		};

		console.log("Updated routine:", updatedRoutine);
		res.status(201).json(updatedRoutine);
	} catch (error) {
		console.error("Error adding exercise to routine:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

// DELETE remove exercise from routine
app.delete(
	"/api/routines/:routineId/exercises/:exerciseId",
	async (req, res) => {
		try {
			await doc.loadInfo();
			const sheet = doc.sheetsByTitle["Routines"];
			const rows = await sheet.getRows();

			const routineIndex = rows.findIndex(
				(row) => row._rawData[0] === req.params.routineId
			);

			if (routineIndex === -1) {
				return res.status(404).json({ error: "Routine not found" });
			}

			const currentExercises = rows[routineIndex]._rawData[2]
				? rows[routineIndex]._rawData[2].split(",")
				: [];
			const updatedExercises = currentExercises.filter(
				(id) => id !== req.params.exerciseId
			);

			rows[routineIndex]._rawData[2] = updatedExercises.join(",");
			await rows[routineIndex].save();

			const updatedRoutine = {
				id: rows[routineIndex]._rawData[0],
				name: rows[routineIndex]._rawData[1],
				exercises: rows[routineIndex]._rawData[2].split(","),
			};

			console.log("Removed exercise from routine:", updatedRoutine);
			res.json(updatedRoutine);
		} catch (error) {
			console.error("Error removing exercise from routine:", error);
			res
				.status(500)
				.json({ error: "Internal Server Error", details: error.message });
		}
	}
);

app.delete("/api/routines/:id", async (req, res) => {
	try {
		await doc.loadInfo();
		const sheet = doc.sheetsByTitle["Routines"];
		const rows = await sheet.getRows();

		const rowIndex = rows.findIndex((row) => row._rawData[0] === req.params.id);

		if (rowIndex === -1) {
			console.log("Routine not found");
			return res.status(404).json({ error: "Routine not found" });
		}

		await rows[rowIndex].delete();

		console.log("Routine deleted successfully");
		res.status(200).json({ message: "Routine deleted successfully" });
	} catch (error) {
		console.error("Error deleting routine:", error);
		res
			.status(500)
			.json({ error: "Internal Server Error", details: error.message });
	}
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
