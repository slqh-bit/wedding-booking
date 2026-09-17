import { Router } from 'express';
import { asyncHandler } from '../http/errors.js';
import { param } from '../http/params.js';
import * as packages from './packages.service.js';

/** Public promo packages catalog. */
export const packagesRouter: Router = Router();

packagesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await packages.listPackages() });
  }),
);

packagesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await packages.getPackage(param(req, 'id')));
  }),
);
