import { Router } from "express";
import multer from "multer";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
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
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const evidenceKindSchema = z.enum(["invoice", "tracking", "chat", "tos", "screenshot", "other"]);

// GET /api/evidence/:stripeId - Get all evidence for a dispute
router.get("/:stripeId", async (req, res) => {
  try {
    const { stripeId } = req.params;

    const evidence = await prisma.evidenceFile.findMany({
      where: { stripeId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ evidence });
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message || "Failed to fetch evidence" });
  }
});

// POST /api/evidence/:stripeId/upload - Upload evidence file
router.post("/:stripeId/upload", upload.single("file"), async (req, res) => {
  try {
    const { stripeId } = req.params;
    const { kind } = req.body;

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

    // Save evidence metadata to database
    const evidence = await prisma.evidenceFile.create({
      data: {
        stripeId,
        kind: validationResult.data,
        filename: req.file.originalname,
        storedPath: `server/uploads/${req.file.filename}`,
        sizeBytes: req.file.size,
      },
    });

    res.json({ ok: true, evidence });
  } catch (error: any) {
    console.error("Error uploading evidence:", error);
    res.status(500).json({ error: error.message || "Failed to upload evidence" });
  }
});

export default router;
