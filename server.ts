import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "data.json");
  const SPREADSHEET_URL = process.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbwBR0A-QOWfJdgiKjHdSXJavFgcJmMHpVOWbVKBqBZXtW3tkturTg9nx-srSQGqsTSY/exec";

  // Function to sync data to Google Spreadsheet
  const syncToSpreadsheet = async (action: string, payload: any) => {
    try {
      console.log(`[SYNC] Enviando ação "${action}" para a planilha...`);
      const response = await fetch(SPREADSHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action, payload })
      });
      console.log(`[SYNC] Resposta da planilha: ${response.status}`);
    } catch (error) {
      console.error("[SYNC] Erro ao sincronizar com a planilha:", error);
    }
  };

  // Initialize data file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ turmas: [], estudantes: [] }));
  }

  // Initial sync from spreadsheet on startup
  try {
    console.log("[SYNC] Buscando dados iniciais da planilha...");
    const syncUrl = `${SPREADSHEET_URL}${SPREADSHEET_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const response = await fetch(syncUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && (data.turmas || data.estudantes)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("[SYNC] Dados da planilha sincronizados localmente com sucesso.");
      }
    }
  } catch (error) {
    console.error("[SYNC] Erro ao buscar dados iniciais da planilha:", error);
  }

  app.use(express.json());

  // API routes
  app.get("/api/data", (req, res) => {
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { action, payload } = req.body;
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

      switch (action) {
        case "addClass":
          data.turmas.push(payload);
          break;
        case "editClass":
          data.turmas = data.turmas.map((t: any) => t.id === payload.id ? payload : t);
          break;
        case "deleteClass":
          data.turmas = data.turmas.filter((t: any) => t.id !== payload.id);
          data.estudantes = data.estudantes.filter((s: any) => s.classId !== payload.id);
          break;
        case "addStudent":
          data.estudantes.push(payload);
          break;
        case "updateStudentSeat":
          data.estudantes = data.estudantes.map((s: any) => 
            s.id === payload.id ? { ...s, row: payload.row, col: payload.col } : s
          );
          break;
        case "swapStudents":
          const { student1, student2 } = payload;
          data.estudantes = data.estudantes.map((s: any) => {
            if (s.id === student1.id) return { ...s, row: student1.row, col: student1.col };
            if (s.id === student2.id) return { ...s, row: student2.row, col: student2.col };
            return s;
          });
          break;
        case "deleteStudent":
          data.estudantes = data.estudantes.filter((s: any) => s.id !== payload.id);
          break;
        case "saveMap":
          data.turmas = data.turmas.map((t: any) => 
            t.id === payload.id ? { 
              ...t, 
              isLocked: true, 
              lastUpdated: payload.lastUpdated,
              history: [...(t.history || []), payload.historyEntry]
            } : t
          );
          // Update students' positions
          if (payload.students) {
            payload.students.forEach((updatedStudent: any) => {
              const index = data.estudantes.findIndex((s: any) => s.id === updatedStudent.id);
              if (index !== -1) {
                data.estudantes[index] = { 
                  ...data.estudantes[index], 
                  row: updatedStudent.row, 
                  col: updatedStudent.col 
                };
              }
            });
          }
          break;
        case "unlockMap":
          data.turmas = data.turmas.map((t: any) => 
            t.id === payload.id ? { 
              ...t, 
              isLocked: false,
              history: [...(t.history || []), payload.historyEntry]
            } : t
          );
          break;
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      
      // Sync to spreadsheet in the background
      syncToSpreadsheet(action, payload);
      
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
