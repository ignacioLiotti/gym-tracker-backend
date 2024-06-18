const express = require("express");
const router = express.Router();
const {
	getSeries,
	createSeries,
	updateSeries,
	deleteSeries,
} = require("../controllers/seriesController");

router.get("/", getSeries);
router.post("/", createSeries);
router.put("/:id", updateSeries);
router.delete("/:id", deleteSeries);

module.exports = router;
