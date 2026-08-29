import type { z } from 'zod';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

export class ValidationError extends Error {
  constructor(
    public readonly fieldErrors: Record<string, string[]>,
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
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
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const validate = validateInput(schema);
    const validatedData = validate(request.data);
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
