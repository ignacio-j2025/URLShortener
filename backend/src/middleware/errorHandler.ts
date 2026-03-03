import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse.js';

// Extend Error for typed app errors
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message));
    return;
  }

  // SQLite constraint violation (unique slug)
  if (
    err instanceof Error &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT_UNIQUE'
  ) {
    res.status(409).json(errorResponse('SLUG_TAKEN', 'That slug is already in use'));
    return;
  }

  console.error('[Unhandled error]', err);
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
}
