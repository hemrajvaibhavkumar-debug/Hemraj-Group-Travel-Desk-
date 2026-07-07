import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5173),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  N8N_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  N8N_WORKORDER_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  N8N_UPLOAD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  FASTAPI_URL: z.string().url().optional().default("http://localhost:8000")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration validation failed:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
