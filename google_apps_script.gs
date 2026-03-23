function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const turmasSheet = getOrCreateSheet(ss, "Turmas");
  const estudantesSheet = getOrCreateSheet(ss, "Estudantes");
  const historicoSheet = getOrCreateSheet(ss, "Historico");

  const turmas = getSheetData(turmasSheet);
  const estudantes = getSheetData(estudantesSheet);
  const historico = getSheetData(historicoSheet);

  const result = {
    turmas: turmas,
    estudantes: estudantes,
    historico: historico
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const turmasSheet = getOrCreateSheet(ss, "Turmas");
    const estudantesSheet = getOrCreateSheet(ss, "Estudantes");
    const historicoSheet = getOrCreateSheet(ss, "Historico");

    switch (action) {
      case "addClass":
        appendRow(turmasSheet, payload);
        break;
      case "editClass":
        updateRow(turmasSheet, "id", payload.id, payload);
        break;
      case "deleteClass":
        deleteRows(turmasSheet, "id", payload.id);
        deleteRows(estudantesSheet, "classId", payload.id);
        break;
      case "addStudent":
        appendRow(estudantesSheet, payload);
        break;
      case "updateStudentSeat":
        updateRow(estudantesSheet, "id", payload.id, { row: payload.row, col: payload.col });
        break;
      case "swapStudents":
        updateRow(estudantesSheet, "id", payload.student1.id, { row: payload.student1.row, col: payload.student1.col });
        updateRow(estudantesSheet, "id", payload.student2.id, { row: payload.student2.row, col: payload.student2.col });
        break;
      case "deleteStudent":
        deleteRows(estudantesSheet, "id", payload.id);
        break;
      case "saveMap":
        // Update class status
        updateRow(turmasSheet, "id", payload.id, { 
          isLocked: true, 
          lastUpdated: payload.lastUpdated 
        });
        // Add history entry
        const historyEntry = payload.historyEntry;
        historyEntry.classId = payload.id;
        appendRow(historicoSheet, historyEntry);
        // Update all students in mass
        if (payload.students && payload.students.length > 0) {
          payload.students.forEach(s => {
            updateRow(estudantesSheet, "id", s.id, { row: s.row, col: s.col });
          });
        }
        break;
      case "unlockMap":
        updateRow(turmasSheet, "id", payload.id, { isLocked: false });
        break;
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper functions
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize headers based on sheet name
    let headers = [];
    if (name === "Turmas") headers = ["id", "name", "rows", "cols", "doorPosition", "deskPosition", "lastUpdated", "isLocked"];
    if (name === "Estudantes") headers = ["id", "classId", "name", "row", "col"];
    if (name === "Historico") headers = ["id", "classId", "date", "teacherName", "action"];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function appendRow(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => obj[header] !== undefined ? obj[header] : "");
  sheet.appendRow(newRow);
}

function updateRow(sheet, key, value, updates) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(key);
  if (keyIndex === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] == value) {
      for (let prop in updates) {
        const colIndex = headers.indexOf(prop);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[prop]);
        }
      }
    }
  }
}

function deleteRows(sheet, key, value) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(key);
  if (keyIndex === -1) return;

  // Iterate backwards to avoid index issues when deleting
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][keyIndex] == value) {
      sheet.deleteRow(i + 1);
    }
  }
}
