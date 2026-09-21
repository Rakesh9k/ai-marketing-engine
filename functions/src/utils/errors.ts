import { HttpsError } from 'firebase-functions/v2/https';
import { UnsupportedVerticalError } from '../config/verticals';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toHttpsError(): HttpsError {
    const codeMap: Record<string, HttpsError['code']> = {
      'validation-error': 'invalid-argument',
      'not-found': 'not-found',
      'permission-denied': 'permission-denied',
      unauthenticated: 'unauthenticated',
      'insufficient-credits': 'resource-exhausted',
      'rate-limit-exceeded': 'resource-exhausted',
      internal: 'internal',
    };
    return new HttpsError(codeMap[this.code] || 'internal', this.message, this.details);
  }
}

export class ValidationError extends AppError {
  constructor(
    public readonly fieldErrors: Record<string, string[]>,
    message = 'Validation failed'
  ) {
    super('validation-error', message, 400, { fieldErrors });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('not-found', `${resource} not found: ${id}`, 404, { resource, id });
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'Access denied') {
    super('permission-denied', message, 403);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super('unauthenticated', message, 401);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      'insufficient-credits',
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      400,
      { required, available }
    );
  }
}

export class RateLimitError extends AppError {
  constructor(action: string) {
    super('rate-limit-exceeded', `Rate limit exceeded for ${action}`, 429, { action });
  }
}

export function mapErrorToHttpsError(error: unknown): HttpsError {
  if (error instanceof AppError) {
    return error.toHttpsError();
  }
  // See UnsupportedVerticalError's own comment (config/verticals.ts) for why
  // it isn't an AppError subclass: that file must stay free of any
  // firebase-functions dependency.
  if (error instanceof UnsupportedVerticalError) {
    return new HttpsError('invalid-argument', error.message, { vertical: error.vertical });
  }
  if (error instanceof Error) {
    return new HttpsError('internal', error.message);
  }
  return new HttpsError('internal', 'An unexpected error occurred');
}
