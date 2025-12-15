import { z } from "zod"

const envSchema = z.object({
  PORT: z.string().default("3001").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Configuration invalide:")
  console.error(parsed.error.format())
  process.exit(1)
}

export const ENV = parsed.data

