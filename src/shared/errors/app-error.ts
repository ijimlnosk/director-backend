export type AppErrorKind =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONSTRAINT_FAILED'
  | 'PROVIDER_FAILED'
  | 'INTERNAL';

const STATUS_BY_KIND: Record<AppErrorKind, number> = {
  VALIDATION: 400,
  AUTHENTICATION: 401,
  AUTHORIZATION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  CONSTRAINT_FAILED: 422,
  PROVIDER_FAILED: 502,
  INTERNAL: 500,
};

/** Application-level error with a stable, client-safe shape. */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(kind: AppErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.statusCode = STATUS_BY_KIND[kind];
    this.details = details;
  }
}

export const notFound = (resource: string): AppError =>
  new AppError('NOT_FOUND', `${resource} not found`);

export const validationFailed = (message: string, details?: unknown): AppError =>
  new AppError('VALIDATION', message, details);

export const conflict = (message: string): AppError => new AppError('CONFLICT', message);

export const constraintFailed = (message: string, details?: unknown): AppError =>
  new AppError('CONSTRAINT_FAILED', message, details);

export const forbidden = (message: string): AppError => new AppError('AUTHORIZATION', message);
