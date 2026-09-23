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
  RAZORPAY_STARTER_PLAN_ID: z.string().optional(),
  RAZORPAY_BUSINESS_PLAN_ID: z.string().optional(),
  RAZORPAY_AGENCY_PLAN_ID: z.string().optional(),
  // PayU (see functions/src/services/payu.ts). PAYU_SALT is a credential —
  // it must only ever be read here (server-side Functions config) and must
  // never be logged, returned to a client, or written to Firestore.
  PAYU_MERCHANT_KEY: z.string().optional(),
  PAYU_SALT: z.string().optional(),
  PAYU_ENVIRONMENT: z.enum(['test', 'production']).default('test'),
  // Standing Instruction (recurring/auto-renewal) capability — off by
  // default. PayU must separately enable SI on the merchant account before
  // this can ever be turned on; see docs/PAYMENT_GATEWAY.md "Recurring
  // billing" section for why this defaults to disabled rather than assumed
  // available.
  PAYU_SI_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  // The deployed HTTPS URLs for payuCallback/payuWebhook (Cloud Run URLs
  // are only known after the functions are first deployed — a real
  // chicken-and-egg constraint, not an oversight — so these must be set
  // post-deploy rather than derived). See docs/PAYMENT_GATEWAY.md.
  PAYU_CALLBACK_URL: z.string().url().optional(),
  PAYU_WEBHOOK_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  // "Create a Reel" video renderer (Cloud Run service running ffmpeg — see
  // services/reel-renderer/). Left unset in local/emulator dev, where
  // services/videoRenderer.ts falls back to a deterministic mock renderer
  // instead of calling out to a real service.
  REEL_RENDERER_URL: z.string().url().optional(),
  REEL_RENDERER_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  // FIREBASE_PROJECT_ID can never be supplied via a .env/.env.local file:
  // Firebase's own dotenv loader rejects any variable starting with the
  // reserved `FIREBASE_` prefix outright (fails to load the whole file, not
  // just that one line) — confirmed by actually running the emulator with
  // FIREBASE_PROJECT_ID in .env.local ("Failed to load environment
  // variables from .env.local"). Both the Cloud Functions runtime and the
  // Functions emulator always inject GCLOUD_PROJECT automatically (it's
  // what admin.initializeApp() with no args itself relies on to
  // auto-detect the project), so that's the real source of truth here —
  // FIREBASE_PROJECT_ID stays supported as an explicit override for
  // anywhere that isn't Cloud Functions/its emulator.
  const withProjectFallback = {
    ...process.env,
    FIREBASE_PROJECT_ID: process.env['FIREBASE_PROJECT_ID'] || process.env['GCLOUD_PROJECT'],
  };

  const result = envSchema.safeParse(withProjectFallback);
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
