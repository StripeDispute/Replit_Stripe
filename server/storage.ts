// server/storage.ts
import { db } from "./db";
import {
  evidenceFiles,
  pdfPackets,
  disputeExplanations,
  type InsertEvidenceFile,
  type InsertPdfPacket,
  type EvidenceFileDb,
  type PdfPacketDb,
  type DisputeExplanationDb,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

class DatabaseStorage {
  // Evidence files

  async getEvidenceFiles(
    userId: string,
    stripeId: string,
  ): Promise<EvidenceFileDb[]> {
    return db
      .select()
      .from(evidenceFiles)
      .where(
        and(
          eq(evidenceFiles.userId, userId),
          eq(evidenceFiles.stripeId, stripeId),
        ),
      )
      .orderBy(evidenceFiles.createdAt);
  }

  async createEvidenceFile(
    data: InsertEvidenceFile & { userId: string },
  ): Promise<EvidenceFileDb> {
    const [row] = await db
      .insert(evidenceFiles)
      .values(data)
      .returning();
    return row;
  }

  async deleteEvidenceFile(userId: string, id: string): Promise<void> {
    await db
      .delete(evidenceFiles)
      .where(and(eq(evidenceFiles.id, id), eq(evidenceFiles.userId, userId)));
  }

  // PDF packets

  async getLatestPacket(
    userId: string,
    stripeId: string,
  ): Promise<PdfPacketDb | null> {
    const rows = await db
      .select()
      .from(pdfPackets)
      .where(
        and(eq(pdfPackets.userId, userId), eq(pdfPackets.stripeId, stripeId)),
      )
      .orderBy(desc(pdfPackets.createdAt))
      .limit(1);

    return rows[0] ?? null;
  }

  async createPdfPacket(
    data: InsertPdfPacket & { userId: string },
  ): Promise<PdfPacketDb> {
    const [row] = await db
      .insert(pdfPackets)
      .values(data)
      .returning();
    return row;
  }

  // Dispute explanations

  async getDisputeExplanation(
    userId: string,
    stripeId: string,
  ): Promise<DisputeExplanationDb | null> {
    const rows = await db
      .select()
      .from(disputeExplanations)
      .where(
        and(
          eq(disputeExplanations.userId, userId),
          eq(disputeExplanations.stripeId, stripeId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async upsertDisputeExplanation(
    userId: string,
    stripeId: string,
    explanation: string,
  ): Promise<DisputeExplanationDb> {
    const existing = await this.getDisputeExplanation(userId, stripeId);

    if (!existing) {
      const [row] = await db
        .insert(disputeExplanations)
        .values({
          userId,
          stripeId,
          explanation,
        })
        .returning();
      return row;
    } else {
      const [row] = await db
        .update(disputeExplanations)
        .set({
          explanation,
          updatedAt: new Date(),
        })
        .where(eq(disputeExplanations.id, existing.id))
        .returning();
      return row;
    }
  }
}

export const storage = new DatabaseStorage();
