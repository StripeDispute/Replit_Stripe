// server/src/routes/evidence.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../../storage";
import { uploadEvidenceSchema } from "@shared/schema";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per file (helps keep under Stripe's 4.5MB total limit)
  },
});

// GET /api/evidence/:stripeId
router.get("/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    const evidence = await storage.getEvidenceFiles(userId, stripeId);

    return res.json({
      evidence: evidence.map((file) => ({
        id: file.id,
        stripeId: file.stripeId,
        kind: file.kind,
        filename: file.filename,
        storedPath: file.storedPath,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch evidence" });
  }
});

// POST /api/evidence/:stripeId/upload
router.post(
  "/:stripeId/upload",
  upload.single("file"),
  async (req: any, res) => {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    try {
      const file = req.file;
      const { kind } = uploadEvidenceSchema.parse(req.body);

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Enforce image-only uploads (PNG/JPEG) for clean inline exhibits
      const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        // remove temp file
        fs.unlink(file.path, () => {});
        return res.status(400).json({
          error:
            "Only PNG and JPEG images are allowed. Please convert other documents to screenshots before uploading.",
        });
      }

      // Save relative path
      const relativePath = path.relative(process.cwd(), file.path);

      const created = await storage.createEvidenceFile({
        userId,
        stripeId,
        kind,
        filename: file.originalname,
        storedPath: relativePath,
        sizeBytes: file.size,
      });

      return res.json({
        evidence: {
          id: created.id,
          stripeId: created.stripeId,
          kind: created.kind,
          filename: created.filename,
          storedPath: created.storedPath,
          sizeBytes: created.sizeBytes,
          createdAt:
            created.createdAt?.toISOString() ?? new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Error uploading evidence:", error);

      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }

      return res
        .status(500)
        .json({ error: error.message || "Failed to upload evidence" });
    }
  },
);

// DELETE /api/evidence/:stripeId/:evidenceId
router.delete("/:stripeId/:evidenceId", async (req: any, res) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user.claims.sub;

    // We delete the DB row; file cleanup is nice-to-have but not required for MVP
    await storage.deleteEvidenceFile(userId, evidenceId);

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting evidence:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to delete evidence" });
  }
});

export default router;
