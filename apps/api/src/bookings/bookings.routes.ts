import { Router } from 'express';
import { createBookingSchema } from '@hafalati/shared';
import { asyncHandler } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import { requireAuth } from '../auth/middleware.js';
import * as bookings from './bookings.service.js';

export const bookingsRouter: Router = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.post(
  '/',
  validateBody(createBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await bookings.createBooking(req.user!.id, req.body);
    res.status(201).json(booking);
  }),
);

bookingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await bookings.listMyBookings(req.user!.id) });
  }),
);

bookingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await bookings.getBooking(req.user!.id, param(req, 'id')));
  }),
);

bookingsRouter.post(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    res.json(await bookings.confirmBooking(req.user!.id, param(req, 'id')));
  }),
);

bookingsRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    res.json(await bookings.cancelBooking(req.user!.id, param(req, 'id')));
  }),
);
