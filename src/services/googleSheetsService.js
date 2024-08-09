const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const path = require("path");
const NodeCache = require("node-cache");
const creds = require(path.join(__dirname, "../../credentials.json"));

// local
const SPREADSHEET_ID = "1nA2B-EJ24uyRSyj2VSk8EAoi6VAPHLntfpYwu2Cp-XU"; // Replace with your spreadsheet ID

const serviceAccountAuth = new JWT({
	email: creds.client_email,
	key: creds.private_key.replace(/\\n/g, "\n"),
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

// Create a cache instance with a standard TTL (Time To Live)
const cache = new NodeCache({ stdTTL: 300 }); // Cache data for 300 seconds (5 minutes)

const getSheetData = async (sheetTitle) => {
	const cacheKey = `sheetData_${sheetTitle}`;
	const cachedData = cache.get(cacheKey);

	if (cachedData) {
		console.log(`Cache hit: Returning cached data for sheet: ${sheetTitle}`);
		return cachedData;
	}

	console.log(`Cache miss: Fetching data from sheet: ${sheetTitle}`);
	await doc.loadInfo(); // Load the document info
	console.log(`Spreadsheet title: ${doc.title}`);

	const sheet = doc.sheetsByTitle[sheetTitle];
	if (!sheet) {
		throw new Error(`Sheet with title "${sheetTitle}" not found`);
	}

	await sheet.loadHeaderRow(); // Ensure headers are loaded
	console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

	const rows = await sheet.getRows();
	const data = rows.map((row) => {
		const rowData = {};
		sheet.headerValues.forEach((header, index) => {
			rowData[header] = row._rawData[index];
		});
		return rowData;
	});

	cache.set(cacheKey, data); // Cache the fetched data
	console.log(`Data cached for sheet: ${sheetTitle}`);
	return data;
};

const getSetsByExerciseId = async (exerciseId) => {
	const cacheKey = `sets_${exerciseId}`;
	const cachedData = cache.get(cacheKey);

	if (cachedData) {
		console.log(
			`Cache hit: Returning cached data for sets of exercise ID: ${exerciseId}`
		);
		return cachedData;
	}

	console.log(`Cache miss: Fetching sets for exercise ID: ${exerciseId}`);
	await doc.loadInfo(); // Load the document info
	console.log(`Spreadsheet title: ${doc.title}`);

	const sheetTitle = `Exercise_${exerciseId}_Sets`;
	const sheet = doc.sheetsByTitle[sheetTitle];
	if (!sheet) {
		console.log(
			`Sheet with title "${sheetTitle}" not found, returning empty data structure`
		);
		return [];
	}

	await sheet.loadHeaderRow(); // Ensure headers are loaded
	console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

	const rows = await sheet.getRows();
	console.log(`Fetched rows from sheet: ${JSON.stringify(rows)}`);

	const data = rows.map((row) => ({
		id: row.id,
		exerciseId: row.exerciseId,
		repetitions: row.repetitions,
		weight: row.weight,
		timestamp: row.timestamp, // Ensure the timestamp is included in the data
	}));

	cache.set(cacheKey, data); // Cache the fetched data
	console.log(`Data cached for sets of exercise ID: ${exerciseId}`);
	return data;
};

const appendSheetData = async (sheetTitle, values) => {
	try {
		console.log(`Fetching spreadsheet info for sheet: ${sheetTitle}`);
		await doc.loadInfo(); // Load the document properties and worksheets
		const sheet = doc.sheetsByTitle[sheetTitle];
		if (!sheet) {
			throw new Error(`Sheet with title "${sheetTitle}" not found`);
		}

		await sheet.loadHeaderRow(); // Load the header row explicitly
		console.log(`Sheet headers: ${sheet.headerValues.join(", ")}`);

		if (!sheet.headerValues.length) {
			throw new Error(
				`Header values are not yet loaded for sheet: ${sheetTitle}`
			);
		}

		// Add timestamp to the values
		values.timestamp = new Date().toISOString();

		const row = await sheet.addRow(values);

		// Log the row ID without causing circular structure error
		console.log(`Row added with values: ${JSON.stringify(values)}`);

		// Invalidate cache for the relevant sheet
		cache.del(`sheetData_${sheetTitle}`);
		if (sheetTitle.startsWith("Exercise_") && sheetTitle.endsWith("_Sets")) {
			const exerciseId = sheetTitle.split("_")[1];
			cache.del(`sets_${exerciseId}`);
		}
		console.log(`Cache invalidated for sheet: ${sheetTitle}`);
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

	// Invalidate cache for the relevant sheet
	cache.del(`sheetData_${sheetTitle}`);
	if (sheetTitle.startsWith("Exercise_") && sheetTitle.endsWith("_Sets")) {
		const exerciseId = sheetTitle.split("_")[1];
		cache.del(`sets_${exerciseId}`);
	}
	console.log(`Cache invalidated for sheet: ${sheetTitle}`);
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

	// Invalidate cache for the relevant sheet
	cache.del(`sheetData_${sheetTitle}`);
	if (sheetTitle.startsWith("Exercise_") && sheetTitle.endsWith("_Sets")) {
		const exerciseId = sheetTitle.split("_")[1];
		cache.del(`sets_${exerciseId}`);
	}
	console.log(`Cache invalidated for sheet: ${sheetTitle}`);
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
