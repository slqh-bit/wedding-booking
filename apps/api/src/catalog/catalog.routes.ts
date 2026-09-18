import { Router } from 'express';
import {
  CATEGORY_ORDER,
  checkAvailabilitySchema,
  searchQuerySchema,
  type ServiceCategory,
} from '@hafalati/shared';
import { asyncHandler, AppError } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import * as catalog from './catalog.service.js';
import * as reviews from '../reviews/reviews.service.js';

export const catalogRouter: Router = Router();

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json({ data: await catalog.listCategories() });
  }),
);

catalogRouter.get(
  '/offerings',
  asyncHandler(async (req, res) => {
    const category = req.query.category as string | undefined;
    if (category && !CATEGORY_ORDER.includes(category as ServiceCategory)) {
      throw AppError.badRequest('invalid_category', 'Unknown category');
    }
    const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : undefined;
    const data = await catalog.listOfferings(category as ServiceCategory | undefined, date);
    res.json({ data });
  }),
);

// Re-check availability when the customer changes the event date.
catalogRouter.post(
  '/offerings/check-availability',
  validateBody(checkAvailabilitySchema),
  asyncHandler(async (req, res) => {
    const { date, offeringIds } = req.body;
    res.json({ unavailable: await catalog.unavailableForDate(date, offeringIds) });
  }),
);

catalogRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const params = searchQuerySchema.parse(req.query);
    res.json(await catalog.searchOfferings(params));
  }),
);

catalogRouter.get(
  '/offerings/:id',
  asyncHandler(async (req, res) => {
    res.json(await catalog.getOffering(param(req, 'id')));
  }),
);

catalogRouter.get(
  '/offerings/:id/reviews',
  asyncHandler(async (req, res) => {
    res.json({ data: await reviews.listOfferingReviews(param(req, 'id')) });
  }),
);

catalogRouter.get(
  '/offerings/:id/availability',
  asyncHandler(async (req, res) => {
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const data = await catalog.getAvailability(param(req, 'id'), month);
    res.json({ data });
  }),
);
