import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import disputesRouter from "./src/routes/disputes";
import evidenceRouter from "./src/routes/evidence";
import packetsRouter from "./src/routes/packets";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // If user doesn't exist in DB, invalidate session
      if (!user) {
        req.logout(() => {
          res.status(401).json({ message: "Unauthorized - user not found" });
        });
        return;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  // Mount protected API routers
  app.use("/api/disputes", isAuthenticated, disputesRouter);
  app.use("/api/evidence", isAuthenticated, evidenceRouter);
  app.use("/api/packets", isAuthenticated, packetsRouter);

  // Serve static files for uploads and packets
  app.use("/static/uploads", express.static(path.join(process.cwd(), "server", "uploads")));
  app.use("/static/packets", express.static(path.join(process.cwd(), "server", "packets")));

  const httpServer = createServer(app);

  return httpServer;
}
