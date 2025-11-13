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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Dispute types
export const disputeSchema = z.object({
  id: z.string(),
  charge: z.string(),
  reason: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["needs_response", "under_review", "warning_needs_response", "warning_under_review", "warning_closed", "charge_refunded", "lost", "won"]),
  createdAt: z.number(),
  dueBy: z.number().nullable(),
});

export type Dispute = z.infer<typeof disputeSchema>;

// Evidence file types
export const evidenceKindSchema = z.enum(["invoice", "tracking", "chat", "tos", "screenshot", "other"]);
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

// Helper function for evidence templates
// Drizzle Database Tables

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
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

// Evidence files table (now scoped to users for multi-tenant support)
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
export const insertEvidenceFileSchema = createInsertSchema(evidenceFiles).omit({ id: true, createdAt: true });
export type InsertEvidenceFile = z.infer<typeof insertEvidenceFileSchema>;

// PDF packets table (now scoped to users for multi-tenant support)
export const pdfPackets = pgTable("pdf_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeId: varchar("stripe_id").notNull(),
  filename: varchar("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PdfPacketDb = typeof pdfPackets.$inferSelect;
export const insertPdfPacketSchema = createInsertSchema(pdfPackets).omit({ id: true, createdAt: true });
export type InsertPdfPacket = z.infer<typeof insertPdfPacketSchema>;

export function getEvidenceTemplate(reason: string): { required: string[], optional: string[] } {
  const templates: Record<string, { required: string[], optional: string[] }> = {
    fraudulent: {
      required: ["Invoice", "Customer communication", "Proof of delivery"],
      optional: ["Shipping tracking", "Customer login history", "Terms of service"],
    },
    product_not_received: {
      required: ["Shipping tracking", "Proof of delivery", "Invoice"],
      optional: ["Customer communication", "Return policy"],
    },
    unrecognized: {
      required: ["Invoice", "Customer communication", "Proof of delivery"],
      optional: ["Customer login history", "Terms of service"],
    },
    duplicate: {
      required: ["Invoice", "Payment receipt", "Customer communication"],
      optional: ["Order confirmation", "Shipping tracking"],
    },
    subscription_canceled: {
      required: ["Terms of service", "Cancellation policy", "Customer communication"],
      optional: ["Invoice", "Usage logs"],
    },
    product_unacceptable: {
      required: ["Product description", "Customer communication", "Return policy"],
      optional: ["Invoice", "Proof of delivery"],
    },
    credit_not_processed: {
      required: ["Refund receipt", "Customer communication"],
      optional: ["Invoice", "Return tracking"],
    },
    general: {
      required: ["Invoice", "Customer communication"],
      optional: ["Terms of service", "Proof of delivery"],
    },
  };

  return templates[reason] || templates.general;
}
