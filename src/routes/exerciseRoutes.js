const express = require("express");
const router = express.Router();
const {
	getExercises,
	getExerciseById,
	createExercise,
	addSetToExercise,
	updateExercise,
	deleteExercise,
	getSetsByExerciseId,
} = require("../controllers/exerciseController");

router.get("/", getExercises);
router.get("/:id", getExerciseById);
router.post("/", createExercise);
router.put("/:id", updateExercise);
router.delete("/:id", deleteExercise);
router.get("/:id/sets", getSetsByExerciseId); // Add this line for fetching sets
router.post("/:id/sets", addSetToExercise); // Add this line for adding sets

module.exports = router;
