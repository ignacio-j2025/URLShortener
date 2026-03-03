import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/apiResponse.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = (result.error as ZodError).flatten().fieldErrors;
      res.status(422).json(errorResponse('VALIDATION_ERROR', fieldErrors));
      return;
    }
    res.locals.validated = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fieldErrors = (result.error as ZodError).flatten().fieldErrors;
      res.status(422).json(errorResponse('VALIDATION_ERROR', fieldErrors));
      return;
    }
    res.locals.validatedQuery = result.data;
    next();
  };
}
