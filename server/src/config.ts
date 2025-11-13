import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
export const PORT = parseInt(process.env.PORT || "4000", 10);

if (!STRIPE_SECRET_KEY) {
  console.warn("⚠️  WARNING: STRIPE_SECRET_KEY is not set. Stripe features will not work.");
}
