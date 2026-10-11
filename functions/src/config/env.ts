import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  FUNCTIONS_EMULATOR: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_REGION: z.string().default('asia-south1'),
  GEMINI_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  // Architected (see docs/AI_ARCHITECTURE.md) but NOT YET CONFIGURED —
  // functions/src/services/ai/providers/{veo,elevenlabs,photoroom} throw
  // until real credentials are set here. Left optional/unset intentionally;
  // do not fabricate values.
  VEO_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  PHOTOROOM_API_KEY: z.string().optional(),
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
  // Legacy Razorpay (kept so the legacy source still compiles; not used for new purchases).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_STARTER_PLAN_ID: z.string().optional(),
  RAZORPAY_BUSINESS_PLAN_ID: z.string().optional(),
  RAZORPAY_AGENCY_PLAN_ID: z.string().optional(),
  // Paddle Billing (replaces PayU for recurring subscriptions).
  // PADDLE_API_KEY — server-side only, never logged or returned to clients.
  // PADDLE_WEBHOOK_SECRET — used in paddleWebhook.ts to verify HMAC-SHA256.
  // PADDLE_PRICE_ID_* — Paddle price IDs (pri_xxx) for each plan tier.
  // NEXT_PUBLIC_* vars are set in .env.local for the Next.js frontend.
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  // No default, on purpose: a billing system must never silently pick an environment.
  // getPaddleClient() throws if this is missing.
  PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
  // One price per (plan, billing cycle) plus one per credit pack. Produced by
  // scripts/setup-paddle-catalog.mjs. Unset => that purchase is refused (never mocked).
  PADDLE_PRICE_ID_STARTER_MONTHLY: z.string().optional(),
  PADDLE_PRICE_ID_STARTER_YEARLY: z.string().optional(),
  PADDLE_PRICE_ID_BUSINESS_MONTHLY: z.string().optional(),
  PADDLE_PRICE_ID_BUSINESS_YEARLY: z.string().optional(),
  PADDLE_PRICE_ID_PRO_MONTHLY: z.string().optional(),
  PADDLE_PRICE_ID_PRO_YEARLY: z.string().optional(),
  PADDLE_PRICE_ID_AGENCY_MONTHLY: z.string().optional(),
  PADDLE_PRICE_ID_AGENCY_YEARLY: z.string().optional(),
  PADDLE_PRICE_ID_PACK_500: z.string().optional(),
  PADDLE_PRICE_ID_PACK_1200: z.string().optional(),
  PADDLE_PRICE_ID_PACK_3000: z.string().optional(),
  // Cashfree (INR gateway; present in code and exported, NOT the primary provider: Paddle is live).
  // CASHFREE_* are server-side only, never logged or sent to the client. CASHFREE_WEBHOOK_SECRET verifies
  // the HMAC-SHA256 signature in cashfreeWebhook.ts. Production status of this gateway: see docs/audits.
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_WEBHOOK_SECRET: z.string().optional(),
  CASHFREE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  CASHFREE_API_VERSION: z.string().default('2023-08-01'),
  CASHFREE_PLAN_ID_STARTER_MONTHLY: z.string().optional(),
  CASHFREE_PLAN_ID_STARTER_YEARLY: z.string().optional(),
  CASHFREE_PLAN_ID_BUSINESS_MONTHLY: z.string().optional(),
  CASHFREE_PLAN_ID_BUSINESS_YEARLY: z.string().optional(),
  CASHFREE_PLAN_ID_PRO_MONTHLY: z.string().optional(),
  CASHFREE_PLAN_ID_PRO_YEARLY: z.string().optional(),
  CASHFREE_PLAN_ID_AGENCY_MONTHLY: z.string().optional(),
  CASHFREE_PLAN_ID_AGENCY_YEARLY: z.string().optional(),
  CASHFREE_PACK_500_ID: z.string().optional(),
  CASHFREE_PACK_1200_ID: z.string().optional(),
  CASHFREE_PACK_3000_ID: z.string().optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  // "Create a Reel" video renderer (Cloud Run service running ffmpeg — see
  // services/reel-renderer/). Left unset in local/emulator dev, where
  // services/videoRenderer.ts falls back to a deterministic mock renderer
  // instead of calling out to a real service.
  REEL_RENDERER_URL: z.string().url().optional(),
  REEL_RENDERER_API_KEY: z.string().optional(),
  // Meta (Facebook & Instagram OAuth / Graph API) configuration
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().url().optional(),
  META_GRAPH_API_VERSION: z.string().default('v20.0'),
  META_TOKEN_ENCRYPTION_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  const withProjectFallback = {
    ...process.env,
    FIREBASE_PROJECT_ID: process.env['FIREBASE_PROJECT_ID'] || process.env['GCLOUD_PROJECT'],
  };

  const result = envSchema.safeParse(withProjectFallback);
  if (!result.success) {
    console.warn('Environment validation failed:', result.error.flatten());
    return {
      ...process.env,
      NODE_ENV: 'development',
      FIREBASE_PROJECT_ID: 'demo-project',
      FIREBASE_REGION: 'asia-south1',
    } as EnvConfig;
  }

  return result.data;
}

export const env = getEnvConfig();
