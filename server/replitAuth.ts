// server/replitAuth.ts
// Stubbed out Replit auth for non-Replit environments (like GitHub Codespaces).
// We don't need Replit OAuth for the Stripe Dispute Assistant MVP outside Replit yet.

import type { Express, Request, Response, NextFunction } from "express";

/**
 * Called from server/routes.ts at startup.
 * In Replit, this used to configure OIDC + sessions.
 * Here we just log and do nothing.
 */
export async function setupAuth(_app: Express) {
  console.warn(
    "Replit auth is disabled in this environment. Skipping Replit OAuth setup."
  );
}

/**
 * Middleware that used to enforce authentication.
 * For now, we stub it out to always allow the request through.
 * We'll replace this later with real email/password auth checks.
 */
export function isAuthenticated(
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  // TODO: later, check req.session / JWT here
  return next();
}
