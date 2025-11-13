import type { Request, Response, NextFunction } from "express";

export interface DisputeSummary {
  id: string;
  charge: string;
  reason: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  dueBy: number | null;
}

export interface EvidenceFileData {
  id: string;
  stripeId: string;
  kind: string;
  filename: string;
  storedPath: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface PdfPacketData {
  id: string;
  stripeId: string;
  filename: string;
  createdAt: Date;
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;
