import { Router } from 'express';
import { reviewInputSchema } from '@hafalati/shared';
import { asyncHandler } from '../http/errors.js';
import { validateBody } from '../http/validate.js';
import { requireAuth } from '../auth/middleware.js';
import * as reviews from './reviews.service.js';

/** Authenticated customer reviews: submit/edit + list own. */
export const reviewsRouter: Router = Router();
reviewsRouter.use(requireAuth);

reviewsRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json({ data: await reviews.listMyReviews(req.user!.id) });
  }),
);

reviewsRouter.post(
  '/',
  validateBody(reviewInputSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await reviews.submitReview(req.user!.id, req.body));
  }),
);
