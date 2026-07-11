import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create an error API response
 */
export function errorResponse(
  message: string,
  code: string,
  status = 400,
  details?: Record<string, any>
) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () =>
    errorResponse('Unauthorized', 'UNAUTHORIZED', 401),
  forbidden: () =>
    errorResponse('Forbidden', 'FORBIDDEN', 403),
  notFound: (resource: string) =>
    errorResponse(`${resource} not found`, 'NOT_FOUND', 404),
  badRequest: (message: string) =>
    errorResponse(message, 'BAD_REQUEST', 400),
  internalError: () =>
    errorResponse('Internal server error', 'INTERNAL_ERROR', 500),
  conflict: (message: string) =>
    errorResponse(message, 'CONFLICT', 409),
};
