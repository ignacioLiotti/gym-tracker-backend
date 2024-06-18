const { v4: uuidv4 } = require("uuid");
const {
	getSheetData,
	appendSheetData,
	updateSheetData,
	deleteSheetData,
} = require("../services/googleSheetsService");

const getRoutines = async (req, res) => {
	try {
		const data = await getSheetData("Routines");
		res.json(data);
	} catch (error) {
		console.error(`Error fetching routines: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const createRoutine = async (req, res) => {
	const { name, description, exercises } = req.body;
	const id = uuidv4();
	console.log(
		`Creating routine with ID: ${id}, name: ${name}, description: ${description}, exercises: ${JSON.stringify(
			exercises
		)}`
	);
	try {
		const addedRow = await appendSheetData("Routines", {
			id,
			name,
			description,
			exercises: JSON.stringify(exercises),
		});
		console.log(
			`Row added with values: ${JSON.stringify({
				id,
				name,
				description,
				exercises: JSON.stringify(exercises),
			})}`
		);
		res.status(201).json({ id });
	} catch (error) {
		console.error(`Error creating routine: ${error.message}`);
		res.status(500).json({ error: error.message });
	}
};

const updateRoutine = async (req, res) => {
	const { id } = req.params;
	const { name, exercises } = req.body;
	try {
		await updateSheetData("Routines", id, {
			name,
			exercises: JSON.stringify(exercises),
		});
		res.json({ message: "Routine updated successfully" });
	} catch (error) {
		console.error(`Error updating routine: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const deleteRoutine = async (req, res) => {
	const { id } = req.params;
	try {
		await deleteSheetData("Routines", id);
		res.json({ message: "Routine deleted successfully" });
	} catch (error) {
		console.error(`Error deleting routine: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const addExerciseToRoutine = async (req, res) => {
	const { id } = req.params;
	const { exerciseId } = req.body;
	try {
		const data = await getSheetData("Routines");
		const routine = data.find((routine) => routine.id === id);
		if (!routine) {
			return res.status(404).json({ error: "Routine not found" });
		}
		const exercises = JSON.parse(routine.exercises || "[]");
		exercises.push(exerciseId);
		await updateSheetData("Routines", id, {
			exercises: JSON.stringify(exercises),
		});
		res.json({ message: "Exercise added successfully" });
	} catch (error) {
		console.error(`Error adding exercise: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const getExercisesInRoutine = async (req, res) => {
	const { id } = req.params;
	try {
		const data = await getSheetData("Routines");
		const routine = data.find((routine) => routine.id === id);
		if (!routine) {
			return res.status(404).json({ error: "Routine not found" });
		}
		const exercises = JSON.parse(routine.exercises || "[]");
		res.json(exercises);
	} catch (error) {
		console.error(`Error fetching exercises: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const getRoutineById = async (req, res) => {
	const { id } = req.params;
	console.log(`Fetching routine with ID: ${id}`);
	try {
		const data = await getSheetData("Routines");
		console.log(`Fetched data: ${JSON.stringify(data, null, 2)}`);

		const routine = data.find((routine) => routine.id === id);
		if (!routine) {
			console.error(`Routine with ID ${id} not found`);
			return res.status(404).json({ error: "Routine not found" });
		}

		// Parse the exercises field to ensure it's an array
		const parsedRoutine = {
			...routine,
			exercises: JSON.parse(routine.exercises || "[]"),
		};

		res.json(parsedRoutine);
	} catch (error) {
		console.error(`Error fetching routine: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

module.exports = {
	getRoutines,
	createRoutine,
	updateRoutine,
	deleteRoutine,
	addExerciseToRoutine,
	getExercisesInRoutine,
	getRoutineById,
};
