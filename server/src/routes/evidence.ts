import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../../storage";
import { evidenceKindSchema, type EvidenceFileDb } from "@shared/schema";

const router = Router();

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "server", "uploads"));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${sanitizedFilename}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// GET /api/evidence/:stripeId - Get all evidence for a dispute (user-scoped)
router.get("/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    const evidence = await storage.getEvidenceFiles(userId, stripeId);

    // Transform database records to match frontend expected format
    const transformedEvidence = evidence.map((e: EvidenceFileDb) => ({
      id: e.id,
      stripeId: e.stripeId,
      kind: e.kind,
      filename: e.filename,
      storedPath: e.storedPath,
      sizeBytes: e.sizeBytes,
      createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
    }));

    res.json({ evidence: transformedEvidence });
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message || "Failed to fetch evidence" });
  }
});

// POST /api/evidence/:stripeId/upload - Upload evidence file (user-scoped)
router.post("/:stripeId/upload", upload.single("file"), async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const { kind } = req.body;
    const userId = req.user.claims.sub;

    // Validate kind
    const validationResult = evidenceKindSchema.safeParse(kind);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid evidence kind. Must be one of: invoice, tracking, chat, tos, screenshot, other" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Save evidence metadata to database with user scoping
    const evidence = await storage.createEvidenceFile({
      userId,
      stripeId,
      kind: validationResult.data,
      filename: req.file.originalname,
      storedPath: `server/uploads/${req.file.filename}`,
      sizeBytes: req.file.size,
    });

    // Transform to match frontend expected format
    const transformedEvidence = {
      id: evidence.id,
      stripeId: evidence.stripeId,
      kind: evidence.kind,
      filename: evidence.filename,
      storedPath: evidence.storedPath,
      sizeBytes: evidence.sizeBytes,
      createdAt: evidence.createdAt?.toISOString() || new Date().toISOString(),
    };

    res.json({ ok: true, evidence: transformedEvidence });
    } catch (error: any) {
    console.error("Error uploading evidence:", error);
    res.status(500).json({ error: error.message || "Failed to upload evidence" });
  }
});

// DELETE /api/evidence/:id - Delete a single evidence file (user-scoped)
router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    // Look up the evidence record first so we know the file path
    const evidence = await storage.getEvidenceFileById(userId, id);

    if (!evidence) {
      return res.status(404).json({ error: "Evidence not found" });
    }

    // Delete DB record
    await storage.deleteEvidenceFile(userId, id);

    // Best-effort delete on-disk file
    if (evidence.storedPath) {
      const fullPath = path.isAbsolute(evidence.storedPath)
        ? evidence.storedPath
        : path.join(process.cwd(), evidence.storedPath);

      fs.unlink(fullPath, (err) => {
        if (err) {
          console.warn("Failed to delete evidence file from disk:", err);
        }
      });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting evidence:", error);
    res.status(500).json({ error: error.message || "Failed to delete evidence" });
  }
});

export default router;
