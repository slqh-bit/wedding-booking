import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  availabilityRangeSchema,
  offeringInputSchema,
  offeringUpdateSchema,
  vendorProfileSchema,
  vendorRegisterSchema,
} from '@hafalati/shared';
import { asyncHandler } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import * as vendors from './vendor.service.js';

// Public: vendor self-registration.
export const vendorPublicRouter: Router = Router();

const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

vendorPublicRouter.post(
  '/register',
  registerLimiter,
  validateBody(vendorRegisterSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await vendors.registerVendor(req.body));
  }),
);

// Role-gated vendor dashboard.
export const vendorRouter: Router = Router();
vendorRouter.use(requireAuth, requireRole('VENDOR'));

vendorRouter.get('/me', asyncHandler(async (req, res) => {
  res.json(await vendors.getMyVendor(req.user!.id));
}));

vendorRouter.patch(
  '/me',
  validateBody(vendorProfileSchema),
  asyncHandler(async (req, res) => {
    res.json(await vendors.updateMyVendor(req.user!.id, req.body));
  }),
);

vendorRouter.get('/offerings', asyncHandler(async (req, res) => {
  res.json({ data: await vendors.listMyOfferings(req.user!.id) });
}));

vendorRouter.post(
  '/offerings',
  validateBody(offeringInputSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await vendors.createMyOffering(req.user!.id, req.body));
  }),
);

vendorRouter.patch(
  '/offerings/:id',
  validateBody(offeringUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await vendors.updateMyOffering(req.user!.id, param(req, 'id'), req.body));
  }),
);

vendorRouter.delete('/offerings/:id', asyncHandler(async (req, res) => {
  res.json(await vendors.deleteMyOffering(req.user!.id, param(req, 'id')));
}));

vendorRouter.post(
  '/offerings/:id/availability',
  validateBody(availabilityRangeSchema),
  asyncHandler(async (req, res) => {
    const { from, to, open } = req.body;
    res.json(await vendors.setAvailabilityRange(req.user!.id, param(req, 'id'), from, to, open));
  }),
);

vendorRouter.get('/bookings', asyncHandler(async (req, res) => {
  res.json({ data: await vendors.listMyBookings(req.user!.id) });
}));

vendorRouter.get('/stats', asyncHandler(async (req, res) => {
  res.json(await vendors.vendorStats(req.user!.id));
}));

vendorRouter.get('/earnings', asyncHandler(async (req, res) => {
  res.json(await vendors.myEarnings(req.user!.id));
}));
