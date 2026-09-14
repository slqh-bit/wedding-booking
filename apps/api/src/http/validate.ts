import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validate & type `req.body` against a Zod schema. Parsed data replaces the
 * body so downstream handlers get the coerced/typed value.
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req.body);
    req.body = parsed as z.infer<S>;
    next();
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req.query);
    // Express 4 req.query is a getter-only in some setups; attach separately.
    (req as Request & { validatedQuery: z.infer<S> }).validatedQuery = parsed;
    next();
  };
}
