// server/src/routes/disputes.ts
import { Router } from "express";
import { stripe } from "../stripeClient";
import { db } from "../../db";
import { disputeExplanations } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

const router = Router();

// GET /api/disputes
router.get("/", async (_req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const disputes = await stripe.disputes.list({ limit: 50 });

    const mapped = disputes.data.map((d) => ({
      id: d.id,
      charge: d.charge,
      reason: d.reason,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      createdAt: d.created * 1000,
      dueBy: d.evidence_details?.due_by
        ? d.evidence_details.due_by * 1000
        : null,
    }));

    return res.json({ disputes: mapped });
  } catch (error: any) {
    console.error("Error listing disputes:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to list disputes" });
  }
});

// GET /api/disputes/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const dispute = await stripe.disputes.retrieve(id);
    return res.json({ dispute });
  } catch (error: any) {
    console.error("Error retrieving dispute:", error);

    if (
      error?.type === "StripeInvalidRequestError" &&
      error?.code === "resource_missing"
    ) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    return res
      .status(500)
      .json({ error: error.message || "Failed to retrieve dispute" });
  }
});

// GET /api/disputes/:id/explanation
router.get("/:id/explanation", async (req, res, next) => {
  try {
    const stripeId = req.params.id;
    // For now, stub user; later this will come from real auth
    const userId = (req as any).user?.id ?? "demo-user";

    const rows = await db
      .select()
      .from(disputeExplanations)
      .where(
        and(
          eq(disputeExplanations.stripeId, stripeId),
          eq(disputeExplanations.userId, userId),
        ),
      )
      .orderBy(desc(disputeExplanations.updatedAt))
      .limit(1);

    const row = rows[0];

    if (!row) {
      // Frontend expects { explanation: null } if none exists
      return res.json({ explanation: null });
    }

    return res.json({
      explanation: {
        text: row.explanation,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/disputes/:id/explanation
router.put("/:id/explanation", async (req, res, next) => {
  try {
    const stripeId = req.params.id;
    const userId = (req as any).user?.id ?? "demo-user";
    const { text } = req.body as { text?: string };

    if (typeof text !== "string" || !text.trim()) {
      return res
        .status(400)
        .json({ error: "Explanation text is required" });
    }

    const explanationText = text.trim();

    // Check if there is already an explanation for this user + dispute
    const existing = await db
      .select()
      .from(disputeExplanations)
      .where(
        and(
          eq(disputeExplanations.stripeId, stripeId),
          eq(disputeExplanations.userId, userId),
        ),
      )
      .orderBy(desc(disputeExplanations.updatedAt))
      .limit(1);

    let row;

    if (existing[0]) {
      const [updated] = await db
        .update(disputeExplanations)
        .set({
          explanation: explanationText,
          updatedAt: new Date(),
        })
        .where(eq(disputeExplanations.id, existing[0].id))
        .returning();

      row = updated;
    } else {
      const [inserted] = await db
        .insert(disputeExplanations)
        .values({
          userId,
          stripeId,
          explanation: explanationText,
        })
        .returning();

      row = inserted;
    }

    return res.json({
      explanation: {
        text: row.explanation,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
