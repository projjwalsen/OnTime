import type { Response } from 'express';

/**
 * Standard API response shape.
 * All endpoints must use these helpers to ensure a consistent response format.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

/**
 * Send a successful JSON response.
 */
export function successResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(body);
}

/**
 * Send an error JSON response.
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown,
): void {
  const body: ApiErrorResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };
  res.status(statusCode).json(body);
}
