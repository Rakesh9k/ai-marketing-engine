import { NextResponse } from 'next/server';

// Process-local memory fallback for dev/test when Upstash Redis credentials are not configured
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  /** Target identifier (e.g. user ID or IP address) */
  identifier: string;
  /** Maximum requests allowed in the time window */
  limit?: number;
  /** Time window in seconds (default: 60s) */
  windowSeconds?: number;
  /** Prefix for counter key (e.g. 'ai-generate', 'login') */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let redisClient: any = null;

function getRedisClient(): any {
  if (redisClient) return redisClient;
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (url && token) {
    try {
      const { Redis } = require('@upstash/redis');
      redisClient = new Redis({ url, token });
      return redisClient;
    } catch (err) {
      console.warn('[RateLimit] Unable to initialize Upstash Redis:', err);
    }
  }
  return null;
}

/**
 * Checks rate limits using distributed Upstash Redis if configured,
 * or process-local sliding window memory store as fallback.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const limit = options.limit ?? 20;
  const windowSeconds = options.windowSeconds ?? 60;
  const prefix = options.prefix ?? 'api-rate-limit';
  const identifier = options.identifier;

  const redis = getRedisClient();

  if (redis) {
    try {
      const { Ratelimit } = require('@upstash/ratelimit');
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix,
      });

      const res = await ratelimit.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis error, falling back to local memory store:', err);
    }
  }

  // Fallback: In-memory sliding window
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${prefix}:${identifier}`;

  const current = inMemoryStore.get(key);

  if (!current || now > current.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: current.resetAt,
    };
  }

  current.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - current.count,
    reset: current.resetAt,
  };
}

/**
 * Helper to construct standard 429 Too Many Requests response.
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
  return new NextResponse(
    JSON.stringify({
      error: 'Too many requests. Please slow down and try again later.',
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfterSeconds)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}
