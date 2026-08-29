import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  FUNCTIONS_EMULATOR: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_REGION: z.string().default('asia-south1'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn('Environment validation failed:', result.error.flatten());
    cachedEnv = {
      NODE_ENV: 'development',
      FIREBASE_PROJECT_ID: 'demo-project',
      FIREBASE_REGION: 'asia-south1',
    } as EnvConfig;
    return cachedEnv;
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export const env = getEnvConfig();
