/**
 * Custom error classes for API Gateway
 */

export class ApiException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestException extends ApiException {
  constructor(message: string = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestException';
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends ApiException {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenException';
  }
}

export class NotFoundException extends ApiException {
  constructor(message: string = 'Resource not found', details?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundException';
  }
}

export class ConflictException extends ApiException {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictException';
  }
}

export class RateLimitException extends ApiException {
  public readonly retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitException';
    this.retryAfter = retryAfter;
  }
}

export class ValidationException extends ApiException {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', details);
    this.name = 'ValidationException';
  }
}
