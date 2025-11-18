import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Dispute types
export const disputeSchema = z.object({
  id: z.string(),
  charge: z.string(),
  reason: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum([
    "needs_response",
    "under_review",
    "warning_needs_response",
    "warning_under_review",
    "warning_closed",
    "charge_refunded",
    "lost",
    "won",
  ]),
  createdAt: z.number(),
  dueBy: z.number().nullable(),
});

export type Dispute = z.infer<typeof disputeSchema>;

// Evidence file types
export const evidenceKindSchema = z.enum([
  "invoice",
  "tracking",
  "chat",
  "tos",
  "screenshot",
  "other",
]);
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;

export const evidenceFileSchema = z.object({
  id: z.string(),
  stripeId: z.string(),
  kind: evidenceKindSchema,
  filename: z.string(),
  storedPath: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
});

export type EvidenceFile = z.infer<typeof evidenceFileSchema>;

export const uploadEvidenceSchema = z.object({
  kind: evidenceKindSchema,
});

export type UploadEvidence = z.infer<typeof uploadEvidenceSchema>;

// PDF Packet types
export const pdfPacketSchema = z.object({
  id: z.string(),
  stripeId: z.string(),
  filename: z.string(),
  createdAt: z.string(),
});

export type PdfPacket = z.infer<typeof pdfPacketSchema>;

// API Response types
export const disputesResponseSchema = z.object({
  disputes: z.array(disputeSchema),
});

export type DisputesResponse = z.infer<typeof disputesResponseSchema>;

export const disputeDetailResponseSchema = z.object({
  dispute: z.any(), // Full Stripe dispute object
});

export const evidenceResponseSchema = z.object({
  evidence: z.array(evidenceFileSchema),
});

export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>;

export const packetResponseSchema = z.object({
  ok: z.boolean(),
  packetId: z.string(),
  downloadUrl: z.string(),
});

export type PacketResponse = z.infer<typeof packetResponseSchema>;

export const latestPacketResponseSchema = z.object({
  packet: pdfPacketSchema.nullable(),
});

export type LatestPacketResponse = z.infer<typeof latestPacketResponseSchema>;

// ─────────────────────────────────────────────
// Drizzle Database Tables
// ─────────────────────────────────────────────

// Session storage table (required previously for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Evidence files table (scoped to users for multi-tenant support)
export const evidenceFiles = pgTable("evidence_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeId: varchar("stripe_id").notNull(),
  kind: varchar("kind").notNull(),
  filename: varchar("filename").notNull(),
  storedPath: varchar("stored_path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EvidenceFileDb = typeof evidenceFiles.$inferSelect;
export const insertEvidenceFileSchema = createInsertSchema(evidenceFiles).omit({
  id: true,
  createdAt: true,
});
export type InsertEvidenceFile = z.infer<typeof insertEvidenceFileSchema>;

// PDF packets table (scoped to users)
export const pdfPackets = pgTable("pdf_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeId: varchar("stripe_id").notNull(),
  filename: varchar("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PdfPacketDb = typeof pdfPackets.$inferSelect;
export const insertPdfPacketSchema = createInsertSchema(pdfPackets).omit({
  id: true,
  createdAt: true,
});
export type InsertPdfPacket = z.infer<typeof insertPdfPacketSchema>;

// New: dispute explanations table (per user + dispute)
export const disputeExplanations = pgTable(
  "dispute_explanations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    stripeId: varchar("stripe_id").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_dispute_explanation_user_stripe").on(
      table.userId,
      table.stripeId,
    ),
  ],
);

export type DisputeExplanationDb = typeof disputeExplanations.$inferSelect;

// Helper function for evidence templates (Stripe-aligned)
export function getEvidenceTemplate(
  reason: string,
): { required: string[]; optional: string[] } {
  const base = {
    required: [
      "Screenshot of invoice/receipt showing date, amount, and items purchased",
      "Screenshot of relevant refund/cancellation policy as seen at checkout",
      "Screenshot of customer communication relevant to this dispute (email/chat)",
    ],
    optional: [
      "Screenshot of customer account login or usage logs",
      "Screenshot of additional internal notes or CRM records",
    ],
  };

  const templates: Record<string, { required: string[]; optional: string[] }> = {
    fraudulent: {
      required: [
        "Screenshot of invoice/receipt showing date, amount, and items purchased",
        "Screenshot of AVS/CVC / 3DS result or payment details from Stripe dashboard",
        "Screenshot of customer login history (IP, device, timestamps) if applicable",
      ],
      optional: [
        "Screenshot of communication where customer acknowledges the charge or usage",
        "Screenshot of terms of service describing how the service is accessed/used",
      ],
    },
    product_not_received: {
      required: [
        "Screenshot of shipping/tracking page showing delivery to cardholder's address",
        "Screenshot of invoice/receipt showing shipping address and items",
        "Screenshot of any communication where customer confirms or discusses delivery",
      ],
      optional: [
        "Screenshot of internal fulfillment system showing shipment and delivery events",
        "Screenshot of refund/return policy relevant to non-delivery claims",
      ],
    },
    unrecognized: {
      required: [
        "Screenshot of invoice/receipt showing merchant descriptor and date",
        "Screenshot of payment details from Stripe dashboard (last 4 digits, brand)",
        "Screenshot of login or account creation showing customer email / name",
      ],
      optional: [
        "Screenshot of prior successful transactions from the same customer",
        "Screenshot of communication where customer acknowledges the charge or account",
      ],
    },
    duplicate: {
      required: [
        "Screenshot of invoices/receipts for both charges showing timestamps",
        "Screenshot of Stripe dashboard showing two charges for the same order",
        "Screenshot of any refund that was processed for the duplicate charge",
      ],
      optional: [
        "Screenshot of communication where customer requested/acknowledged refund",
      ],
    },
    subscription_canceled: {
      required: [
        "Screenshot of subscription details (renewal date, amount) from Stripe or your app",
        "Screenshot of cancellation policy as shown to the customer",
        "Screenshot of communication showing when and how the customer canceled (if applicable)",
      ],
      optional: [
        "Screenshot of usage logs after cancellation date (if customer continued to use service)",
      ],
    },
    product_unacceptable: {
      required: [
        "Screenshot of product/service description as shown on your site",
        "Screenshot of invoice/receipt showing what was purchased",
        "Screenshot of communication where customer describes the issue",
      ],
      optional: [
        "Screenshot of return/refund policy relevant to dissatisfaction or defects",
        "Screenshot of any resolution offered (replacement, partial refund, etc.)",
      ],
    },
    credit_not_processed: {
      required: [
        "Screenshot of refund in Stripe dashboard (date, amount, transaction ID)",
        "Screenshot of communication where you confirmed a refund/credit to the customer",
      ],
      optional: [
        "Screenshot of internal accounting or CRM records showing refund request handling",
      ],
    },
    general: base,
  };

  return templates[reason] || base;
}
