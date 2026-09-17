import { createApp } from './app.js';
import { port } from './env.js';
import { logger } from './logger.js';

const app = createApp();

// Bind 0.0.0.0 so container platforms (Railway/Render) can route to it.
app.listen(port, '0.0.0.0', () => {
  logger.info(`🎉 حفلاتي API listening on port ${port}`);
});
