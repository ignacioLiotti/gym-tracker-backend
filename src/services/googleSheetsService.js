const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const path = require("path");

const serviceAccountAuth = new JWT({
	email: process.env.GOOGLE_CLIENT_EMAIL,
	key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(
	process.env.SPREADSHEET_ID,
	serviceAccountAuth
);

const getSheetData = async (sheetTitle) => {
	await doc.loadInfo(); // Load the document info
	console.log(`Spreadsheet title: ${doc.title}`);

	const sheet = doc.sheetsByTitle[sheetTitle];
	if (!sheet) {
		throw new Error(`Sheet with title "${sheetTitle}" not found`);
	}

	await sheet.loadHeaderRow(); // Ensure headers are loaded
	console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

	const rows = await sheet.getRows();
	return rows.map((row) => {
		const rowData = {};
		sheet.headerValues.forEach((header, index) => {
			rowData[header] = row._rawData[index];
		});
		return rowData;
	});
};

const getSetsByExerciseId = async (exerciseId) => {
	await doc.loadInfo(); // Load the document info
	console.log(`Spreadsheet title: ${doc.title}`);

	const sheetTitle = `Exercise_${exerciseId}_Sets`;
	const sheet = doc.sheetsByTitle[sheetTitle];
	if (!sheet) {
		throw new Error(`Sheet with title "${sheetTitle}" not found`);
	}

	await sheet.loadHeaderRow(); // Ensure headers are loaded
	console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

	const rows = await sheet.getRows();
	console.log(`Fetched rows from sheet: ${JSON.stringify(rows)}`);

	return rows.map((row) => ({
		id: row.id,
		exerciseId: row.exerciseId,
		repetitions: row.repetitions,
		weight: row.weight,
	}));
};

const appendSheetData = async (sheetTitle, values) => {
	try {
		console.log(`Fetching spreadsheet info for sheet: ${sheetTitle}`);
		await doc.loadInfo(); // Load the document properties and worksheets
		const sheet = doc.sheetsByTitle[sheetTitle];
		if (!sheet) {
			sheet = await doc.addSheet({
				title: sheetTitle,
				headerValues: ["id", "exerciseId", "repetitions", "weight"],
			});
		}
		await sheet.loadHeaderRow(); // Load the header row explicitly
		console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

		if (!sheet.headerValues.length) {
			throw new Error(
				`Header values are not yet loaded for sheet: ${sheetTitle}`
			);
		}

		const row = await sheet.addRow(values);

		// Log the row ID without causing circular structure error
		console.log(`Row added with values: ${JSON.stringify(values)}`);
		return row;
	} catch (error) {
		console.error(`Error in appendSheetData: ${error.message}`);
		throw new Error(`Failed to add row: ${error.message}`);
	}
};

const updateSheetData = async (sheetTitle, id, updates) => {
	await doc.loadInfo();
	const sheet = doc.sheetsByTitle[sheetTitle];
	await sheet.loadHeaderRow();
	const rows = await sheet.getRows();
	const row = rows.find((row) => row.id === id);
	if (!row) {
		throw new Error(`Row with ID ${id} not found`);
	}
	Object.assign(row, updates);
	await row.save();
};

const deleteSheetData = async (sheetTitle, id) => {
	await doc.loadInfo();
	const sheet = doc.sheetsByTitle[sheetTitle];
	await sheet.loadHeaderRow();
	const rows = await sheet.getRows();
	const row = rows.find((row) => row.id === id);
	if (!row) {
		throw new Error(`Row with ID ${id} not found`);
	}
	await row.delete();
};

const getRoutines = async (req, res) => {
	try {
		console.log("Fetching routines from Google Sheets");
		const data = await getSheetData("Routines");
		console.log("Routines data:", data);
		res.json(data);
	} catch (error) {
		console.error(`Error fetching routines: ${error.message}`);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

module.exports = {
	getSheetData,
	appendSheetData,
	updateSheetData,
	deleteSheetData,
	getSetsByExerciseId,
	getRoutines,
};
