import type { Request } from 'express';
import { AppError } from './errors.js';

/** Read a required route param (typed as string, not string | undefined). */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw AppError.badRequest('missing_param', `Missing route parameter: ${name}`);
  }
  return value;
}
