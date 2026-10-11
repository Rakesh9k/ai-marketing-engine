import { onRequest } from 'firebase-functions/v2/https';
import { createLogger } from '../../utils/logging';
import {
  verifyWhatsAppSignature,
  processInboundMessageEvent,
  type WhatsAppWebhookPayload,
} from '../../services/whatsappService';

const logger = createLogger({ function: 'whatsappWebhook' });

export const whatsappWebhook = onRequest(
  { secrets: ['WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'] },
  async (req, res) => {
    // 1. GET Request: Webhook Challenge Verification from Meta
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'mitra_whatsapp_verify_token_default';

      if (mode === 'subscribe' && token === expectedToken) {
        logger.info('WhatsApp webhook challenge verification succeeded.');
        res.status(200).send(challenge);
        return;
      }

      logger.warn('WhatsApp webhook verification failed: Token mismatch or invalid mode.');
      res.status(403).send('Forbidden');
      return;
    }

    // 2. POST Request: Inbound Event Notification Processing
    if (req.method === 'POST') {
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      if (appSecret && !verifyWhatsAppSignature(req.rawBody || JSON.stringify(req.body), signature, appSecret)) {
        logger.warn('WhatsApp webhook signature verification failed.');
        res.status(401).send('Unauthorized');
        return;
      }

      const payload = req.body as WhatsAppWebhookPayload;

      if (payload?.object === 'whatsapp_business_account' && Array.isArray(payload.entry)) {
        for (const entry of payload.entry) {
          if (Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              const value = change.value;
              if (value && Array.isArray(value.messages)) {
                for (const message of value.messages) {
                  await processInboundMessageEvent(message, value.metadata?.phone_number_id || '');
                }
              }
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
      return;
    }

    res.status(405).send('Method Not Allowed');
  }
);
