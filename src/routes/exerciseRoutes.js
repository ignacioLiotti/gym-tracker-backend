const express = require("express");
const router = express.Router();
const {
	getExercises,
	getExerciseById,
	createExercise,
	updateExercise,
	deleteExercise,
	addSetToExercise,
	getSetsByExerciseId,
} = require("../controllers/exerciseController");

router.get("/", getExercises);
router.get("/:id", getExerciseById);
router.post("/", createExercise);
router.put("/:id", updateExercise);
router.delete("/:id", deleteExercise);
router.post("/:id/sets", addSetToExercise);
router.get("/:id/sets", getSetsByExerciseId);

module.exports = router;
