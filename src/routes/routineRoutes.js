const express = require("express");
const router = express.Router();
const {
	getRoutines,
	getRoutineById,
	createRoutine,
	updateRoutine,
	deleteRoutine,
	addExerciseToRoutine,
	getExercisesInRoutine,
} = require("../controllers/routineController");

router.get("/", getRoutines);
router.get("/:id", getRoutineById);
router.post("/", createRoutine);
router.put("/:id", updateRoutine);
router.delete("/:id", deleteRoutine);
router.post("/:id/exercises", addExerciseToRoutine);
router.get("/:id/exercises", getExercisesInRoutine);

module.exports = router;
