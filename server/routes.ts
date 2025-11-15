import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import disputesRouter from "./src/routes/disputes";
import evidenceRouter from "./src/routes/evidence";
import packetsRouter from "./src/routes/packets";

/**
 * Simple demo auth middleware.
 *
 * This replaces Replit's OIDC auth. For now, we just inject
 * a single "demo" user into req.user so the rest of the code
 * (which expects req.user.claims.sub) keeps working.
 *
 * Later, we can swap this out for real email/password auth or
 * Stripe-powered login without changing the dispute/evidence logic.
 */
function demoAuth(req: any, _res: any, next: any) {
  // Shape this to look roughly like the Replit user object
  // that the existing code expects.
  req.user = {
    claims: {
      sub: "demo-user", // this becomes userId in storage.ts
    },
  };

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Very simple "auth" endpoint – always returns the same demo user.
  // Frontend hook useAuth() calls this at /api/auth/user.
  app.get("/api/auth/user", demoAuth, (_req: any, res: any) => {
    // Shape this roughly like your User type from @shared/schema.
    // It doesn't have to be perfect for the UI to work.
    const demoUser = {
      id: "demo-user",
      email: "demo@example.com",
      name: "Demo User",
      // You can add more fields later if you want.
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json(demoUser);
  });

  // Mount API routers with demoAuth so req.user exists and
  // evidence/packets can use req.user.claims.sub as userId.
  app.use("/api/disputes", demoAuth, disputesRouter);
  app.use("/api/evidence", demoAuth, evidenceRouter);
  app.use("/api/packets", demoAuth, packetsRouter);

  // Serve static files for uploads and packets
  app.use(
    "/static/uploads",
    express.static(path.join(process.cwd(), "server", "uploads")),
  );
  app.use(
    "/static/packets",
    express.static(path.join(process.cwd(), "server", "packets")),
  );

  const httpServer = createServer(app);

  return httpServer;
}
