import type { z } from 'zod';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { createLogger } from '../utils/logging';

// Phase 14: these two wrappers gate EVERY callable function and reject
// unauthenticated/malformed requests before the target handler's own
// logFunctionStart ever runs — so until now, a rejection here (expired
// token, missing App Check, bad payload shape) left zero trace in Cloud
// Logging. An operator investigating "why is this customer locked out"
// had nothing to search for. This logger only records the function name
// and rejection reason — never the request payload itself, which may
// contain business/customer data.
const authLogger = createLogger({ function: 'validatedCallable' });

export class ValidationError extends Error {
  constructor(
    public readonly fieldErrors: Record<string, string[]>,
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Firebase's httpsCallable client SDK serializes `undefined` object
 * properties as `null` on the wire (confirmed via a real emulator call: an
 * onboarding form building `{ description: form.description || undefined }`
 * arrived server-side as `{ description: null }`, failing every
 * `z.string().optional()` field with "Expected string, received null" even
 * though the client never intended to send a value at all). None of this
 * codebase's schemas use `.nullable()` to mean something semantically
 * different from "absent", so it's safe to normalize `null` -> `undefined`
 * for every callable at this single shared entry point rather than patching
 * every optional field in every schema individually.
 */
function nullToUndefinedDeep(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(nullToUndefinedDeep);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      result[key] = nullToUndefinedDeep(v);
    }
    return result;
  }
  return value;
}

export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(nullToUndefinedDeep(data));
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }
      throw new ValidationError(fieldErrors, 'Invalid input');
    }
    return result.data;
  };
}

export function validatedCallable<T, R>(
  schema: z.ZodSchema<T>,
  handler: (data: T, context: { userId: string; token: any }) => Promise<R>
) {
  return async (request: CallableRequest<T>): Promise<R> => {
    if (!request.auth) {
      authLogger.warn('Rejected unauthenticated call');
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const validate = validateInput(schema);
    let validatedData: T;
    try {
      validatedData = validate(request.data);
    } catch (error) {
      authLogger.warn('Rejected call with invalid input', {
        userId: request.auth.uid,
        fieldErrors: error instanceof ValidationError ? Object.keys(error.fieldErrors) : undefined,
      });
      throw error;
    }
    return handler(validatedData, {
      userId: request.auth.uid,
      token: request.auth.token,
    });
  };
}

export function validatedCallableWithBusiness<T, R>(
  schema: z.ZodSchema<T>,
  businessIdField: keyof T = 'businessId' as keyof T,
  handler: (data: T, context: { userId: string; businessId: string; token: any }) => Promise<R>
) {
  return async (request: CallableRequest<T>): Promise<R> => {
    if (!request.auth) {
      authLogger.warn('Rejected unauthenticated call');
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const validate = validateInput(schema);
    const validatedData = validate(request.data);
    const businessId = validatedData[businessIdField] as string;
    if (!businessId) {
      throw new HttpsError('invalid-argument', 'businessId is required');
    }
    return handler(validatedData, {
      userId: request.auth.uid,
      businessId,
      token: request.auth.token,
    });
  };
}
