import { Router } from 'express';
import { z } from 'zod';
import {
  offeringInputSchema,
  offeringUpdateSchema,
  recordPaymentSchema,
} from '@hafalati/shared';
import { asyncHandler } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import * as admin from './admin.service.js';

export const adminRouter: Router = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

// ── Offerings ───────────────────────────────────────────
adminRouter.get(
  '/offerings',
  asyncHandler(async (_req, res) => {
    res.json({ data: await admin.listAllOfferings() });
  }),
);

adminRouter.post(
  '/offerings',
  validateBody(offeringInputSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await admin.createOffering(req.body));
  }),
);

adminRouter.patch(
  '/offerings/:id',
  validateBody(offeringUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await admin.updateOffering(param(req, 'id'), req.body));
  }),
);

adminRouter.delete(
  '/offerings/:id',
  asyncHandler(async (req, res) => {
    res.json(await admin.deleteOffering(param(req, 'id')));
  }),
);

// ── Bookings ────────────────────────────────────────────
const statusSchema = z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);

adminRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const status = req.query.status ? statusSchema.parse(req.query.status) : undefined;
    res.json({ data: await admin.listBookings(status) });
  }),
);

adminRouter.patch(
  '/bookings/:id/status',
  validateBody(z.object({ status: statusSchema })),
  asyncHandler(async (req, res) => {
    res.json(await admin.setBookingStatus(param(req, 'id'), req.body.status));
  }),
);

adminRouter.post(
  '/bookings/:id/payments',
  validateBody(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await admin.recordPayment(param(req, 'id'), req.body));
  }),
);

// ── Payments ────────────────────────────────────────────
adminRouter.post(
  '/payments/:id/confirm',
  asyncHandler(async (req, res) => {
    res.json(await admin.confirmPayment(param(req, 'id'), req.user!.id));
  }),
);

// ── Notifications ───────────────────────────────────────
adminRouter.get(
  '/notifications',
  asyncHandler(async (_req, res) => {
    res.json({ data: await admin.listNotifications() });
  }),
);

// ── Dashboard ───────────────────────────────────────────
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await admin.dashboardStats());
  }),
);
