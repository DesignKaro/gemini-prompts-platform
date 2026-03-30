import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SITE_CONFIG_ENV: z.enum(['development', 'staging', 'production']).optional(),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  FRONTEND_URL: z.string().url().default('http://localhost:30001'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  SUPERADMIN_EMAILS: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_API_BASE_URL: z.string().url().default('https://api.razorpay.com'),
  MEDIA_STORAGE_DRIVER: z.enum(['none', 'ftps']).default('none'),
  MEDIA_PUBLIC_BASE_URL: z.string().url().default('https://media.geminiprompts.io/gemini_prompts'),
  FTP_HOST: z.string().optional(),
  FTP_PORT: z.coerce.number().int().positive().default(21),
  FTP_USER: z.string().optional(),
  FTP_PASS: z.string().optional(),
  FTP_SECURE_MODE: z.enum(['none', 'explicit', 'implicit']).default('explicit'),
  FTP_ROOT_DIR: z.string().default('/public_html/gemini_prompts'),
  FTP_TLS_REJECT_UNAUTHORIZED: z.string().default('true'),
  FTP_TLS_SERVERNAME: z.string().optional(),
  REDIS_URL: z.string().min(1),
  MEILI_URL: z.string().min(1),
  MEILI_MASTER_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
