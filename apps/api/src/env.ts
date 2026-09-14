import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  WEB_ORIGIN: z.string().default('http://localhost:5173'),

  TVA_RATE: z.coerce.number().default(0.19),
  TIMBRE_FISCAL_TND: z.coerce.number().default(1.0),
  DEPOSIT_RATE: z.coerce.number().default(0.3),

  PLATFORM_NAME: z.string().default('حفلاتي'),
  PLATFORM_PHONE: z.string().default(''),
  PLATFORM_EMAIL: z.string().default(''),
  PLATFORM_ADDRESS: z.string().default(''),
  BANK_TRANSFER_DETAILS: z.string().default(''),

  // Public base URLs used to build gateway return + webhook links.
  PUBLIC_WEB_URL: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),

  // Payment gateway (Phase 2). `mock` needs no credentials and drives dev/tests.
  PAYMENT_PROVIDER: z.enum(['mock', 'konnect', 'flouci', 'd17']).default('mock'),
  KONNECT_API_KEY: z.string().default(''),
  KONNECT_WALLET_ID: z.string().default(''),
  KONNECT_BASE_URL: z.string().default('https://api.konnect.network/api/v2'),
  KONNECT_WEBHOOK_SECRET: z.string().default(''),

  // Flouci (https://developers.flouci.com)
  FLOUCI_APP_TOKEN: z.string().default(''),
  FLOUCI_APP_SECRET: z.string().default(''),
  FLOUCI_BASE_URL: z.string().default('https://developers.flouci.com'),

  // D17 (La Poste Tunisienne e-wallet). Endpoint/field names are configurable
  // and must be confirmed against D17's merchant docs before go-live.
  D17_API_KEY: z.string().default(''),
  D17_MERCHANT_ID: z.string().default(''),
  D17_BASE_URL: z.string().default(''),

  // Notifications (Phase 2). `console` logs instead of sending (dev/test default).
  NOTIFY_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  NOTIFY_FROM: z.string().default('حفلاتي <no-reply@hafalati.tn>'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),

  // Which channels a customer notification fans out to (csv). A channel with no
  // credentials logs to the console instead of sending, so this works in dev.
  NOTIFY_CHANNELS: z.string().default('email'),
  // Twilio (SMS + WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_SMS_FROM: z.string().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default(''),
  // Telegram Bot API
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_OPS_CHAT_ID: z.string().default(''),
  TELEGRAM_BOT_USERNAME: z.string().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
});

// In test we don't require real secrets; provide safe fallbacks.
const raw = {
  ...process.env,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-000000000000000',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-00000000000000',
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgresql://hafalati:hafalati@localhost:5432/hafalati?schema=public',
};

export const env = envSchema.parse(raw);

export const fiscalConfig = {
  tvaRate: env.TVA_RATE,
  timbreFiscalTnd: env.TIMBRE_FISCAL_TND,
  depositRate: env.DEPOSIT_RATE,
};
