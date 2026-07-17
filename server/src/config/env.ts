import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import fs from "fs";

// Robust loader that searches upwards for .env to support ESM, CJS, dev, and prod bundling
function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dotenv.config();
}
loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().default(5173),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  N8N_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  N8N_WORKORDER_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  N8N_UPLOAD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  FASTAPI_URL: z.string().url().optional().default("http://localhost:8000"),
  GOOGLE_DRIVE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().optional().default("")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration validation failed:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
