// server/src/routes/disputes.ts
import { Router } from "express";
import { stripe } from "../stripeClient";
import { storage } from "../../storage";

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

    if (error?.type === "StripeInvalidRequestError" && error?.code === "resource_missing") {
      return res.status(404).json({ error: "Dispute not found" });
    }

    return res
      .status(500)
      .json({ error: error.message || "Failed to retrieve dispute" });
  }
});

// NEW: GET /api/disputes/:id/explanation
router.get("/:id/explanation", async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    const existing = await storage.getDisputeExplanation(userId, id);

    return res.json({
      explanation: existing?.explanation ?? "",
    });
  } catch (error: any) {
    console.error("Error fetching dispute explanation:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch explanation" });
  }
});

// NEW: POST /api/disputes/:id/explanation
router.post("/:id/explanation", async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const { explanation } = req.body as { explanation?: string };

    if (typeof explanation !== "string" || explanation.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Explanation must be a non-empty string" });
    }

    const updated = await storage.upsertDisputeExplanation(
      userId,
      id,
      explanation.trim(),
    );

    return res.json({
      ok: true,
      explanation: updated.explanation,
    });
  } catch (error: any) {
    console.error("Error saving dispute explanation:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to save explanation" });
  }
});

export default router;
