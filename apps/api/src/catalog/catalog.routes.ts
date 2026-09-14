import { Router } from 'express';
import { CATEGORY_ORDER, type ServiceCategory } from '@hafalati/shared';
import { asyncHandler, AppError } from '../http/errors.js';
import { param } from '../http/params.js';
import * as catalog from './catalog.service.js';

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
    const data = await catalog.listOfferings(category as ServiceCategory | undefined);
    res.json({ data });
  }),
);

catalogRouter.get(
  '/offerings/:id',
  asyncHandler(async (req, res) => {
    res.json(await catalog.getOffering(param(req, 'id')));
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
