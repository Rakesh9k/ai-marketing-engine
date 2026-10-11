import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_USE_EMULATORS: z.enum(['true', 'false']).optional().default('false'),
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional().default('sandbox'),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  FIREBASE_PROJECT_ID: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and exports public client-safe environment variables.
 */
export function parsePublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'],
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env['NEXT_PUBLIC_RECAPTCHA_SITE_KEY'],
    NEXT_PUBLIC_USE_EMULATORS: process.env['NEXT_PUBLIC_USE_EMULATORS'],
    NEXT_PUBLIC_PADDLE_ENVIRONMENT: process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'],
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'],
  });

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error('Invalid client public environment variables configuration:\n' + errorDetails);
    throw new Error('Invalid client public environment variables configuration');
  }

  return result.data;
}

/**
 * Validates and exports server-side environment variables.
 */
export function parseServerEnv(): ServerEnv {
  const publicEnv = parsePublicEnv();
  const result = serverEnvSchema.safeParse({
    ...publicEnv,
    FIREBASE_PROJECT_ID: process.env['FIREBASE_PROJECT_ID'],
    UPSTASH_REDIS_REST_URL: process.env['UPSTASH_REDIS_REST_URL'],
    UPSTASH_REDIS_REST_TOKEN: process.env['UPSTASH_REDIS_REST_TOKEN'],
    SENTRY_ORG: process.env['SENTRY_ORG'],
    SENTRY_PROJECT: process.env['SENTRY_PROJECT'],
    NODE_ENV: process.env['NODE_ENV'],
  });

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error('Invalid server environment variables configuration:\n' + errorDetails);
    throw new Error('Invalid server environment variables configuration');
  }

  return result.data;
}
