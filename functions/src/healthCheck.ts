import { onCall } from 'firebase-functions/v2/https';

export const healthCheck = onCall({ region: 'asia-south1' }, async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  environment: process.env['FUNCTIONS_EMULATOR'] ? 'emulator' : 'production',
}));
