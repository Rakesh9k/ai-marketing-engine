import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const healthCheck = functions.https.onCall((_request) => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  environment: process.env['FUNCTIONS_EMULATOR'] ? 'emulator' : 'production',
}));
