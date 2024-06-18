const {
	getSheetData,
	appendSheetData,
	updateSheetData,
	deleteSheetData,
} = require("../services/googleSheetsService");

const SHEET_NAME = "Series";

const getSeries = async (req, res) => {
	try {
		const data = await getSheetData(`${SHEET_NAME}!A:D`);
		const series = data.map((row, index) => ({
			id: index + 1,
			exerciseId: row[0],
			repetitions: row[1],
			weight: row[2],
			date: row[3],
		}));
		res.json(series);
	} catch (error) {
		res.status(500).json({ message: "Error fetching series" });
	}
};

const createSeries = async (req, res) => {
	try {
		const { exerciseId, repetitions, weight, date } = req.body;
		await appendSheetData(`${SHEET_NAME}!A:D`, [
			[exerciseId, repetitions, weight, date],
		]);
		res.status(201).json({ message: "Series created successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error creating series" });
	}
};

const updateSeries = async (req, res) => {
	try {
		const { id } = req.params;
		const { exerciseId, repetitions, weight, date } = req.body;
		await updateSheetData(`${SHEET_NAME}!A${id}:D${id}`, [
			[exerciseId, repetitions, weight, date],
		]);
		res.json({ message: "Series updated successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error updating series" });
	}
};

const deleteSeries = async (req, res) => {
	try {
		const { id } = req.params;
		await deleteSheetData(`${SHEET_NAME}!A${id}:D${id}`);
		res.json({ message: "Series deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error deleting series" });
	}
};

module.exports = {
	getSeries,
	createSeries,
	updateSeries,
	deleteSeries,
};
