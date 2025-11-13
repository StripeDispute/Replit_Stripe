import { Router } from "express";
import { stripe } from "../stripeClient";
import type { DisputeSummary } from "../types";

const router = Router();

// GET /api/disputes - List all disputes
router.get("/", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const disputes = await stripe.disputes.list({ limit: 50 });

    const simplifiedDisputes: DisputeSummary[] = disputes.data.map((d) => ({
      id: d.id,
      charge: d.charge as string,
      reason: d.reason,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      createdAt: d.created * 1000,
      dueBy: d.evidence_details?.due_by ? d.evidence_details.due_by * 1000 : null,
    }));

    res.json({ disputes: simplifiedDisputes });
  } catch (error: any) {
    console.error("Error fetching disputes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch disputes" });
  }
});

// GET /api/disputes/:id - Get single dispute
router.get("/:id", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const dispute = await stripe.disputes.retrieve(req.params.id);
    res.json({ dispute });
  } catch (error: any) {
    console.error("Error fetching dispute:", error);
    
    if (error.code === "resource_missing") {
      return res.status(404).json({ error: "Dispute not found" });
    }
    
    res.status(500).json({ error: error.message || "Failed to fetch dispute" });
  }
});

export default router;
