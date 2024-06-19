const { v4: uuidv4 } = require("uuid");
const {
	getSheetData,
	appendSheetData,
	updateSheetData,
	deleteSheetData,
} = require("../services/googleSheetsService");

const getExercises = async (req, res) => {
	try {
		const data = await getSheetData("Exercises");
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const getExerciseById = async (req, res) => {
	try {
		const { id } = req.params;
		console.log(`Fetching exercise with ID: ${id}`);
		const data = await getSheetData("Exercises");
		console.log("data", data);
		const exercise = data.find((ex) => ex.id === id);
		if (!exercise) {
			console.error(`Exercise with ID ${id} not found`);
			return res.status(404).json({ error: "Exercise not found" });
		}
		res.json(exercise);
	} catch (error) {
		console.error(`Error fetching exercise: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const createExercise = async (req, res) => {
	const { name, description, muscleGroup } = req.body;
	const id = uuidv4();
	console.log(
		`Creating exercise with ID: ${id}, name: ${name}, description: ${description}, muscleGroup: ${muscleGroup}`
	);
	try {
		const addedRow = await appendSheetData("Exercises", {
			id,
			name,
			description,
			muscleGroup,
		});
		res.status(201).json({ id });
	} catch (error) {
		console.error(`Error creating exercise: ${error.message}`);
		res.status(500).json({ error: error.message });
	}
};

const createSheetIfNotExists = async (sheetTitle) => {
	await doc.loadInfo();
	if (!doc.sheetsByTitle[sheetTitle]) {
		const sheet = await doc.addSheet({
			title: sheetTitle,
			headerValues: ["id", "exerciseId", "repetitions", "weight"],
		});
		console.log(`Created new sheet with title: ${sheetTitle}`);
		return sheet;
	}
	return doc.sheetsByTitle[sheetTitle];
};

const addSetToExercise = async (req, res) => {
	const { id } = req.params;
	const { repetitions, weight } = req.body;

	console.log(`Received request to add set to exercise with ID: ${id}`);
	console.log(`Repetitions: ${repetitions}, Weight: ${weight}`);

	// Validate input data
	if (!id || typeof repetitions !== "number" || typeof weight !== "number") {
		return res.status(400).json({ error: "Invalid input data" });
	}

	try {
		const setId = uuidv4();
		const set = {
			id: setId,
			exerciseId: id,
			repetitions,
			weight,
		};

		const sheetTitle = `Exercise_${id}_Sets`;
		await createSheetIfNotExists(sheetTitle); // Ensure the sheet exists

		await appendSheetData(sheetTitle, set); // Add new row to the specific exercise's set sheet

		res.json({ message: "Set added successfully" });
	} catch (error) {
		console.error(`Error adding set: ${error.message}`);
		res.status(500).json({ error: error.message });
	}
};

const getSetsByExerciseId = async (req, res) => {
	try {
		const { id } = req.params;
		console.log(`Fetching sets for exercise ID: ${id}`);

		const sheetTitle = `Exercise_${id}_Sets`;
		console.log(`Sheet title generated: ${sheetTitle}`);

		// Ensure the sheet exists
		console.log(`Ensuring the sheet ${sheetTitle} exists`);
		await createSheetIfNotExists(sheetTitle);
		console.log(`Sheet ${sheetTitle} is confirmed to exist or was created`);

		// Fetch the sets data
		console.log(`Fetching data from sheet ${sheetTitle}`);
		const sets = await getSheetData(sheetTitle);
		console.log(`Fetched sets data: ${JSON.stringify(sets)}`);

		res.json(sets);
	} catch (error) {
		console.error(`Error fetching sets: ${error.message}`);
		res.status(500).json({ error: error.message });
	}
};

const updateExercise = async (req, res) => {
	const { id } = req.params;
	const values = req.body;
	try {
		await updateSheetData("Exercises", id, values);
		res.json({ message: "Exercise updated successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const deleteExercise = async (req, res) => {
	const { id } = req.params;
	try {
		await deleteSheetData("Exercises", id);
		res.json({ message: "Exercise deleted successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

module.exports = {
	getExercises,
	getExerciseById,
	createExercise,
	addSetToExercise,
	getSetsByExerciseId,
	updateExercise,
	deleteExercise,
};
