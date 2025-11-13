import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import disputesRouter from "./src/routes/disputes";
import evidenceRouter from "./src/routes/evidence";
import packetsRouter from "./src/routes/packets";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  // Mount API routers
  app.use("/api/disputes", disputesRouter);
  app.use("/api/evidence", evidenceRouter);
  app.use("/api/packets", packetsRouter);

  // Serve static files for uploads and packets
  app.use("/static/uploads", express.static(path.join(process.cwd(), "server", "uploads")));
  app.use("/static/packets", express.static(path.join(process.cwd(), "server", "packets")));

  const httpServer = createServer(app);

  return httpServer;
}
