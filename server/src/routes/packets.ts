import { Router } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { storage } from "../../storage";
import { stripe } from "../stripeClient";
import type { EvidenceFileDb } from "@shared/schema";

const router = Router();

// POST /api/packets/:stripeId - Generate PDF packet (user-scoped)
router.post("/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    // Fetch dispute data
    const dispute = await stripe.disputes.retrieve(stripeId);

    // Fetch evidence files (user-scoped)
    const evidence = await storage.getEvidenceFiles(userId, stripeId);

    // Create PDF
    const timestamp = Date.now();
    const filename = `dispute_${stripeId}_${timestamp}.pdf`;
    const packetsDir = path.join(process.cwd(), "server", "packets");
    const filePath = path.join(packetsDir, filename);

    // Ensure packets directory exists
    if (!fs.existsSync(packetsDir)) {
      fs.mkdirSync(packetsDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(20).font("Helvetica-Bold").text(`Stripe Dispute Evidence Packet`, { align: "center" });
    doc.fontSize(12).font("Helvetica").text(stripeId, { align: "center" });
    doc.moveDown(2);

    // Dispute Summary Section
    doc.fontSize(16).font("Helvetica-Bold").text("Dispute Summary");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    
    const amount = (dispute.amount / 100).toFixed(2);
    doc.text(`Amount: ${amount} ${dispute.currency.toUpperCase()}`);
    doc.text(`Reason: ${dispute.reason.replace(/_/g, " ")}`);
    doc.text(`Status: ${dispute.status.replace(/_/g, " ")}`);
    doc.text(`Created: ${new Date(dispute.created * 1000).toLocaleString()}`);
    
    if (dispute.evidence_details?.due_by) {
      doc.text(`Due By: ${new Date(dispute.evidence_details.due_by * 1000).toLocaleString()}`);
    }
    
    doc.moveDown(2);

    // Customer & Charge Section
    doc.fontSize(16).font("Helvetica-Bold").text("Customer & Charge Information");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Charge ID: ${dispute.charge}`);
    
    if (dispute.payment_intent) {
      doc.text(`Payment Intent: ${dispute.payment_intent}`);
    }
    
    doc.moveDown(2);

    // Evidence Files Section
    doc.fontSize(16).font("Helvetica-Bold").text("Evidence Files");
    doc.moveDown(0.5);

    if (evidence.length === 0) {
      doc.fontSize(11).font("Helvetica").text("No evidence files uploaded yet.");
    } else {
      // Table header
      doc.fontSize(10).font("Helvetica-Bold");
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 150;
      const col3 = 350;
      const col4 = 450;

      doc.text("Type", col1, tableTop);
      doc.text("Filename", col2, tableTop);
      doc.text("Size", col3, tableTop);
      doc.text("Uploaded", col4, tableTop);
      
      doc.moveDown(0.5);
      doc.strokeColor("#cccccc").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.fontSize(9).font("Helvetica");
      evidence.forEach((file: EvidenceFileDb) => {
        const y = doc.y;
        doc.text(file.kind, col1, y);
        doc.text(file.filename.substring(0, 30), col2, y);
        doc.text(`${(file.sizeBytes / 1024).toFixed(1)} KB`, col3, y);
        const uploadDate = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A';
        doc.text(uploadDate, col4, y);
        doc.moveDown(0.8);
      });
    }

    doc.moveDown(2);

    // Notes Section
    doc.fontSize(16).font("Helvetica-Bold").text("Notes");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.list([
      "Review all evidence files before submitting to Stripe",
      "Ensure evidence matches the dispute reason requirements",
      "Submit evidence before the due date to avoid auto-closure",
      "Keep copies of all submitted evidence for your records",
    ], { bulletRadius: 2 });

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).font("Helvetica").fillColor("#666666");
    doc.text(
      `Generated on ${new Date().toLocaleString()} by Stripe Dispute Assistant`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Save packet record to database (user-scoped)
    const packet = await storage.createPdfPacket({
      userId,
      stripeId,
      filename: `server/packets/${filename}`,
    });

    res.json({
      ok: true,
      packetId: packet.id,
      downloadUrl: `/api/packets/download/${packet.id}`,
    });
  } catch (error: any) {
    console.error("Error generating packet:", error);
    res.status(500).json({ error: error.message || "Failed to generate PDF packet" });
  }
});

// GET /api/packets/latest/:stripeId - Get latest packet for a dispute (user-scoped)
router.get("/latest/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    const packet = await storage.getLatestPacket(userId, stripeId);

    // Transform to match frontend expected format
    const transformedPacket = packet ? {
      id: packet.id,
      stripeId: packet.stripeId,
      filename: packet.filename,
      createdAt: packet.createdAt?.toISOString() || new Date().toISOString(),
    } : null;

    res.json({ packet: transformedPacket });
  } catch (error: any) {
    console.error("Error fetching latest packet:", error);
    res.status(500).json({ error: error.message || "Failed to fetch packet" });
  }
});

// GET /api/packets/download/:packetId - Download a PDF packet
router.get("/download/:packetId", async (req: any, res) => {
  try {
    const { packetId } = req.params;
    const userId = req.user.claims.sub;

    // Note: In production you'd want to verify the packet belongs to the user
    // For now, we'll fetch by ID directly but this should be improved
    const packet = await storage.getLatestPacket(userId, req.query.stripeId as string);

    if (!packet || packet.id !== packetId) {
      return res.status(404).json({ error: "Packet not found" });
    }

    const filePath = path.join(process.cwd(), packet.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    const filename = path.basename(packet.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("Error downloading packet:", error);
    res.status(500).json({ error: error.message || "Failed to download packet" });
  }
});

export default router;
