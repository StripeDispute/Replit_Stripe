import {
  users,
  evidenceFiles,
  pdfPackets,
  type User,
  type UpsertUser,
  type EvidenceFileDb,
  type InsertEvidenceFile,
  type PdfPacketDb,
  type InsertPdfPacket,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Evidence file operations (scoped by user)
  getEvidenceFiles(userId: string, stripeId: string): Promise<EvidenceFileDb[]>;
  createEvidenceFile(evidence: InsertEvidenceFile): Promise<EvidenceFileDb>;
  
  // PDF packet operations (scoped by user)
  getLatestPacket(userId: string, stripeId: string): Promise<PdfPacketDb | undefined>;
  createPdfPacket(packet: InsertPdfPacket): Promise<PdfPacketDb>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Evidence file operations (scoped by user)
  async getEvidenceFiles(userId: string, stripeId: string): Promise<EvidenceFileDb[]> {
    return await db
      .select()
      .from(evidenceFiles)
      .where(and(eq(evidenceFiles.userId, userId), eq(evidenceFiles.stripeId, stripeId)))
      .orderBy(desc(evidenceFiles.createdAt));
  }

  async createEvidenceFile(evidence: InsertEvidenceFile): Promise<EvidenceFileDb> {
    const [file] = await db.insert(evidenceFiles).values(evidence).returning();
    return file;
  }

  // PDF packet operations (scoped by user)
  async getLatestPacket(userId: string, stripeId: string): Promise<PdfPacketDb | undefined> {
    const [packet] = await db
      .select()
      .from(pdfPackets)
      .where(and(eq(pdfPackets.userId, userId), eq(pdfPackets.stripeId, stripeId)))
      .orderBy(desc(pdfPackets.createdAt))
      .limit(1);
    return packet;
  }

  async createPdfPacket(packet: InsertPdfPacket): Promise<PdfPacketDb> {
    const [pdfPacket] = await db.insert(pdfPackets).values(packet).returning();
    return pdfPacket;
  }
}

export const storage = new DatabaseStorage();
