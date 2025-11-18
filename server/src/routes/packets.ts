// server/src/routes/packets.ts
import { Router } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { stripe } from "../stripeClient";
import { storage } from "../../storage";
import { db } from "../../db";
import { pdfPackets, type EvidenceFileDb } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

function formatAmount(amountInCents: number, currency: string): string {
  const amount = (amountInCents / 100).toFixed(2);
  return `${amount} ${currency.toUpperCase()}`;
}

function formatDateTime(epochSeconds?: number | null): string {
  if (!epochSeconds) return "N/A";
  return new Date(epochSeconds * 1000).toLocaleString();
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

router.post("/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    // 1. Stripe dispute data
    const dispute = await stripe.disputes.retrieve(stripeId);

    // 2. Evidence + explanation from our DB
    const evidence = await storage.getEvidenceFiles(userId, stripeId);
    const explanationRecord = await storage.getDisputeExplanation(
      userId,
      stripeId,
    );
    const explanationText = explanationRecord?.explanation ?? "";

    // Precompute exhibit letters (A, B, C, ...)
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const exhibits: { letter: string; file: EvidenceFileDb }[] = evidence.map(
      (file, idx) => ({
        letter: letters[idx] ?? `${idx + 1}`,
        file,
      }),
    );

    // Prepare filesystem path
    const timestamp = Date.now();
    const filename = `dispute_${stripeId}_${timestamp}.pdf`;
    const packetsDir = path.join(process.cwd(), "server", "packets");
    const filePath = path.join(packetsDir, filename);

    if (!fs.existsSync(packetsDir)) {
      fs.mkdirSync(packetsDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const margin = doc.page.margins.left;
    const usableWidth = doc.page.width - margin * 2;

    // ─────────────────────────────────────────────
    // Cover + Section 1: Dispute Summary
    // ─────────────────────────────────────────────
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Stripe Dispute Evidence Packet", {
        align: "center",
      });
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Dispute ID: ${stripeId}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(16).font("Helvetica-Bold").text("1. Dispute Summary");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");

    doc.text(`Charge ID: ${dispute.charge || "N/A"}`, {
      width: usableWidth,
      align: "left",
    });
    if (typeof dispute.payment_intent === "string") {
      doc.text(`Payment Intent: ${dispute.payment_intent}`, {
        width: usableWidth,
        align: "left",
      });
    }

    doc.text(
      `Amount: ${formatAmount(dispute.amount, dispute.currency)}`,
      { width: usableWidth, align: "left" },
    );
    doc.text(
      `Reason: ${
        String(dispute.reason || "").replace(/_/g, " ").trim() || "N/A"
      }`,
      { width: usableWidth, align: "left" },
    );
    doc.text(
      `Status: ${
        String(dispute.status || "").replace(/_/g, " ").trim() || "N/A"
      }`,
      { width: usableWidth, align: "left" },
    );
    doc.text(
      `Created: ${formatDateTime(dispute.created)}`,
      { width: usableWidth, align: "left" },
    );

    if (dispute.evidence_details?.due_by) {
      doc.text(
        `Evidence Due By: ${formatDateTime(dispute.evidence_details.due_by)}`,
        { width: usableWidth, align: "left" },
      );
    }

    doc.moveDown(1.5);

    // ─────────────────────────────────────────────
    // Section 2: Dispute Explanation (merchant narrative)
    // ─────────────────────────────────────────────
    doc.fontSize(16).font("Helvetica-Bold").text("2. Dispute Explanation");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");

    if (explanationText) {
      doc.text(explanationText, { width: usableWidth, align: "left" });
    } else {
      doc.text(
        "The merchant asserts that this payment was valid and fulfilled as agreed. The following exhibits provide supporting documentation.",
        { width: usableWidth, align: "left" },
      );
    }

    doc.moveDown(1.5);

    // ─────────────────────────────────────────────
    // Section 3: Transaction & Customer Details
    // ─────────────────────────────────────────────
    doc.fontSize(16).font("Helvetica-Bold").text("3. Transaction & Customer Details");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");

    const ev: any = dispute.evidence || {};

    if (ev.customer_name) {
      doc.text(`Customer Name: ${ev.customer_name}`, {
        width: usableWidth,
        align: "left",
      });
    }
    if (ev.customer_email_address) {
      doc.text(`Customer Email: ${ev.customer_email_address}`, {
        width: usableWidth,
        align: "left",
      });
    }
    if (ev.customer_billing_address) {
      doc.text(`Billing Address: ${ev.customer_billing_address}`, {
        width: usableWidth,
        align: "left",
      });
    }
    if (ev.customer_shipping_address) {
      doc.text(`Shipping Address: ${ev.customer_shipping_address}`, {
        width: usableWidth,
        align: "left",
      });
    }
    if (ev.product_description) {
      doc.text(`Product / Service: ${ev.product_description}`, {
        width: usableWidth,
        align: "left",
      });
    }
    if (ev.customer_purchase_ip) {
      doc.text(`Customer IP: ${ev.customer_purchase_ip}`, {
        width: usableWidth,
        align: "left",
      });
    }

    doc.moveDown(1.5);

    // ─────────────────────────────────────────────
    // Section 4: Evidence Index
    // ─────────────────────────────────────────────
    doc.fontSize(16).font("Helvetica-Bold").text("4. Evidence Index");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");

    if (exhibits.length === 0) {
      doc.text(
        "No evidence has been uploaded for this dispute.",
        { width: usableWidth, align: "left" },
      );
    } else {
      const tableTop = doc.y;

      const colExhibit = margin;
      const colType = margin + usableWidth * 0.10;
      const colFilename = margin + usableWidth * 0.28;
      const colDesc = margin + usableWidth * 0.55;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Exhibit", colExhibit, tableTop);
      doc.text("Type", colType, tableTop);
      doc.text("Filename", colFilename, tableTop);
      doc.text("Description", colDesc, tableTop);

      doc.moveDown(0.5);
      const ruleY = doc.y;
      doc
        .moveTo(colExhibit, ruleY)
        .lineTo(margin + usableWidth, ruleY)
        .stroke();
      doc.moveDown(0.3);

      doc.fontSize(10).font("Helvetica");

      for (const { letter, file } of exhibits) {
        const rowY = doc.y;
        const kindLabel = file.kind.toUpperCase();

        // Simple heuristic descriptions
        let description = "";
        switch (file.kind) {
          case "invoice":
            description =
              "Invoice/receipt showing date, amount, and purchased items.";
            break;
          case "tracking":
            description =
              "Shipping/tracking proof showing delivery to cardholder's address.";
            break;
          case "chat":
            description =
              "Customer communication relevant to this dispute.";
            break;
          case "tos":
            description =
              "Terms/refund policy as presented to the customer.";
            break;
          case "screenshot":
            description =
              "Screenshot supporting the merchant's position for this dispute.";
            break;
          default:
            description = "Supporting documentation for this dispute.";
        }

        doc.text(letter, colExhibit, rowY, {
          width: colType - colExhibit - 4,
        });
        doc.text(kindLabel, colType, rowY, {
          width: colFilename - colType - 4,
        });
        doc.text(file.filename || "N/A", colFilename, rowY, {
          width: colDesc - colFilename - 4,
        });
        doc.text(description, colDesc, rowY, {
          width: margin + usableWidth - colDesc,
        });
        doc.moveDown(0.5);
      }
    }

    // ─────────────────────────────────────────────
    // Section 5: Exhibits (images inline)
    // ─────────────────────────────────────────────
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").text("5. Exhibits");
    doc.moveDown(0.75);

    const imageExhibits = exhibits.filter(({ file }) => {
      const ext = path.extname(file.filename || "").toLowerCase();
      return [".png", ".jpg", ".jpeg"].includes(ext);
    });

    if (imageExhibits.length === 0) {
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          "No image-based exhibits were uploaded. See the Evidence Index for details of any attached documentation.",
          { width: usableWidth, align: "left" },
        );
    } else {
      let firstExhibit = true;

      for (const { letter, file } of imageExhibits) {
        if (!firstExhibit) {
          doc.addPage();
        }
        firstExhibit = false;

        const heading = `Exhibit ${letter} – ${file.kind.toUpperCase()} (${file.filename})`;

        doc.fontSize(12).font("Helvetica-Bold").text(heading, {
          width: usableWidth,
          align: "left",
        });
        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .font("Helvetica")
          .text(
            `Uploaded: ${
              file.createdAt
                ? (file.createdAt as any as Date).toLocaleString()
                : "N/A"
            } • Size: ${formatBytes(file.sizeBytes)}`,
            { width: usableWidth, align: "left" },
          );
        doc.moveDown(0.75);

        try {
          const absPath = path.isAbsolute(file.storedPath)
            ? file.storedPath
            : path.join(process.cwd(), file.storedPath);

if (fs.existsSync(absPath)) {
  const maxImageWidth = usableWidth;
  const maxImageHeight = doc.page.height - margin * 2 - 80;

  // 👇 add explicit x, y so TypeScript matches the correct overload
  doc.image(
    absPath,
    margin,       // x position (align with text margin)
    doc.y,        // y position (current cursor)
    {
      fit: [maxImageWidth, maxImageHeight],
      align: "left",
      valign: "top",
    },
  );
} else {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("red")
    .text(
      "⚠ Unable to embed exhibit image: file not found on server.",
      { width: usableWidth, align: "left" },
    )
    .fillColor("black");
}
        } catch (err) {
          console.error("Error embedding image evidence into PDF:", err);
          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("red")
            .text(
              "⚠ An error occurred while embedding this exhibit image. The evidence is still listed in the index above.",
              { width: usableWidth, align: "left" },
            )
            .fillColor("black");
        }
      }
    }

    // Finalize PDF
    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    });

    const pdfPacket = await storage.createPdfPacket({
      userId,
      stripeId,
      filename: path.join("server", "packets", filename),
    });

    return res.json({
      ok: true,
      packetId: pdfPacket.id,
      downloadUrl: `/api/packets/download/${pdfPacket.id}`,
    });
  } catch (error: any) {
    console.error("Error generating PDF packet:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate packet" });
  }
});

// GET /api/packets/latest/:stripeId
router.get("/latest/:stripeId", async (req: any, res) => {
  try {
    const { stripeId } = req.params;
    const userId = req.user.claims.sub;

    const packet = await storage.getLatestPacket(userId, stripeId);

    if (!packet) {
      return res.json({ packet: null });
    }

    return res.json({
      packet: {
        id: packet.id,
        stripeId: packet.stripeId,
        filename: packet.filename,
        createdAt: packet.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching latest packet:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch packet" });
  }
});

// GET /api/packets/download/:packetId
router.get("/download/:packetId", async (req: any, res) => {
  try {
    const { packetId } = req.params;
    const userId = req.user.claims.sub;

    const [packet] = await db
      .select()
      .from(pdfPackets)
      .where(and(eq(pdfPackets.id, packetId), eq(pdfPackets.userId, userId)));

    if (!packet) {
      return res.status(404).json({ error: "Packet not found" });
    }

    const filePath = path.isAbsolute(packet.filename)
      ? packet.filename
      : path.join(process.cwd(), packet.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Packet file missing on server" });
    }

    const basename = path.basename(packet.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${basename}"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("Error downloading packet:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to download packet" });
  }
});

export default router;
