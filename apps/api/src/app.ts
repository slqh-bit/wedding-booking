import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './env.js';
import { logger } from './logger.js';
import { errorHandler } from './http/errors.js';
import { authRouter } from './auth/auth.routes.js';
import { catalogRouter } from './catalog/catalog.routes.js';
import { bookingsRouter } from './bookings/bookings.routes.js';
import { paymentsRouter } from './payments/payments.routes.js';
import { notificationsRouter } from './notifications/notifications.routes.js';
import { vendorPublicRouter, vendorRouter } from './vendor/vendor.routes.js';
import { reviewsRouter } from './reviews/reviews.routes.js';
import { packagesRouter } from './packages/packages.routes.js';
import { adminRouter } from './admin/admin.routes.js';

export function createApp(): Express {
  const app = express();

  // When the API also serves the built PWA, disable helmet's default CSP so the
  // app's Google Fonts + inline styles load (a tuned CSP can come later).
  app.use(helmet({ contentSecurityPolicy: env.SERVE_WEB ? false : undefined }));
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'hafalati-api' }));

  // Public platform info (bank transfer details shown at checkout).
  app.get('/api/v1/platform', (_req, res) => {
    res.json({
      name: env.PLATFORM_NAME,
      phone: env.PLATFORM_PHONE,
      email: env.PLATFORM_EMAIL,
      address: env.PLATFORM_ADDRESS,
      bankTransferDetails: env.BANK_TRANSFER_DETAILS,
      fiscal: {
        tvaRate: env.TVA_RATE,
        timbreFiscalTnd: env.TIMBRE_FISCAL_TND,
        depositRate: env.DEPOSIT_RATE,
      },
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', catalogRouter);
  app.use('/api/v1/bookings', bookingsRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/vendors', vendorPublicRouter);
  app.use('/api/v1/vendor', vendorRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/packages', packagesRouter);
  app.use('/api/v1/admin', adminRouter);

  // Single-service deploy: serve the built PWA and fall back to index.html for
  // client-side routes (anything that isn't an API path or the health check).
  if (env.SERVE_WEB) {
    const webDist = env.WEB_DIST_DIR
      ? path.resolve(env.WEB_DIST_DIR)
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
  });
  app.use(errorHandler);

  return app;
}
