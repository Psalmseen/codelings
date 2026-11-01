import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32 || secret === 'change-me') throw new Error('Set JWT_SECRET to a long random string (32+ characters) in production');
  if (!process.env.CLIENT_URL) throw new Error('Set CLIENT_URL to the public address of the app (used in email links)');
}

export const env = {
  isProduction,
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: required('MONGO_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  CLIENT_URLS: (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',').map((url) => url.trim()),
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM ?? 'Codelings <hello@codelings.local>',
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  // Optional: push notification keys. If unset they're generated once and kept in the database.
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  LEAGUE_TIMEZONE: process.env.LEAGUE_TIMEZONE ?? 'Africa/Lagos',
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_NAME: process.env.ADMIN_NAME ?? 'Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

export const clientUrl = env.CLIENT_URLS[0];
