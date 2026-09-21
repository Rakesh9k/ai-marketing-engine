import * as functions from 'firebase-functions';

export interface LogContext {
  userId?: string;
  businessId?: string;
  campaignId?: string;
  requestId?: string;
  stage?: string;
  latencyMs?: number;
  costEstimateINR?: number;
  error?: string;
  [key: string]: any;
}

// Phase 14: a defensive, generic safety net — not a substitute for careful
// error construction at each call site. Some AI provider SDKs (Gemini in
// particular sends its API key as a `?key=...` query parameter) can embed
// the full request URL, including the credential, inside a thrown error's
// own .message when the underlying HTTP client formats a network error as
// "request to <url> failed". Every error that reaches this logger — from
// any provider, present or future — is redacted the same way before it
// ever reaches functions.logger, rather than trusting each individual
// provider file to never leak this.
const SECRET_PATTERNS: RegExp[] = [
  /([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/gi,
  /(Authorization:\s*Bearer\s+)\S+/gi,
  /\bsk-[A-Za-z0-9]{16,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\brzp_(live|test)_[A-Za-z0-9]{10,}\b/g,
];

function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) =>
      text.replace(pattern, (match, prefix) => (prefix ? `${prefix}[REDACTED]` : '[REDACTED]')),
    value
  );
}

export function createLogger(context: LogContext = {}) {
  const baseContext = {
    ...context,
    timestamp: new Date().toISOString(),
    environment: process.env['FUNCTIONS_EMULATOR'] ? 'emulator' : 'production',
  };

  return {
    info: (message: string, extra: Record<string, any> = {}) => {
      functions.logger.info(message, { ...baseContext, ...extra });
    },
    warn: (message: string, extra: Record<string, any> = {}) => {
      functions.logger.warn(message, { ...baseContext, ...extra });
    },
    error: (message: string, error: Error | unknown, extra: Record<string, any> = {}) => {
      const errorInfo =
        error instanceof Error
          ? {
              message: redactSecrets(error.message),
              stack: error.stack ? redactSecrets(error.stack) : undefined,
            }
          : { message: redactSecrets(String(error)) };
      functions.logger.error(message, { ...baseContext, error: errorInfo, ...extra });
    },
    debug: (message: string, extra: Record<string, any> = {}) => {
      functions.logger.debug(message, { ...baseContext, ...extra });
    },
  };
}

export function logFunctionStart(
  functionName: string,
  context: LogContext
): { startTime: number; logger: ReturnType<typeof createLogger> } {
  const logger = createLogger({ ...context, function: functionName });
  logger.info(`${functionName}.start`, context);
  return { startTime: Date.now(), logger };
}

export function logFunctionStage(
  logger: ReturnType<typeof createLogger>,
  stage: string,
  context: Record<string, any> = {}
): void {
  logger.info(`stage.${stage}`, { stage, ...context });
}

export function logFunctionComplete(
  logger: ReturnType<typeof createLogger>,
  startTime: number,
  result: {
    success: boolean;
    creditsUsed?: number;
    assetsGenerated?: number;
    error?: string;
    count?: number;
    [key: string]: any;
  },
  context: Record<string, any> = {}
): void {
  const latencyMs = Date.now() - startTime;
  logger.info('function.complete', {
    latencyMs,
    success: result.success,
    creditsUsed: result.creditsUsed,
    assetsGenerated: result.assetsGenerated,
    error: result.error,
    ...context,
  });
}

export function logFunctionError(
  logger: ReturnType<typeof createLogger>,
  startTime: number,
  error: Error,
  context: Record<string, any> = {}
): void {
  const latencyMs = Date.now() - startTime;
  logger.error('function.failed', error, {
    latencyMs,
    errorMessage: error.message,
    ...context,
  });
}
