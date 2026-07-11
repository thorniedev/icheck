import { ZodError } from 'zod';
import { errorResponse } from './response';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle API errors and return appropriate responses
 */
export function handleApiError(error: unknown) {
  console.error('[API Error]', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      error.flatten ? error.flatten().fieldErrors : undefined
    );
  }

  // Custom API errors
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.code, error.status, error.details);
  }

  // Standard errors
  if (error instanceof Error) {
    return errorResponse(error.message, 'INTERNAL_ERROR', 500);
  }

  // Unknown errors
  return errorResponse(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500
  );
}

/**
 * Async API handler wrapper for error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T | Response>
) {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      return handleApiError(error);
    }
  };
}
