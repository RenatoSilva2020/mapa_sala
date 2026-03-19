import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "data.json");

  // Initialize data file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ turmas: [], estudantes: [] }));
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

  app.post("/api/data", (req, res) => {
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
