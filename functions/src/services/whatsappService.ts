import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createLogger } from '../utils/logging';

const logger = createLogger({ service: 'whatsappService' });
const db = admin.firestore();

export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  text?: {
    body: string;
  };
}

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  messages?: WhatsAppInboundMessage[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: WhatsAppWebhookValue;
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

/**
  * Verifies WhatsApp Cloud API webhook X-Hub-Signature-256 HMAC digest.
  */
export function verifyWhatsAppSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac('sha256', appSecret);
  const digest = hmac.update(rawBody).digest('hex');

  const digestBuffer = Buffer.from(digest, 'hex');
  let expectedBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(expectedSignature, 'hex');
  } catch {
    return false;
  }

  if (digestBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, expectedBuffer);
}

/**
  * Extracts campaign attribution ID from prefilled message text.
  * e.g. "Hi! I am interested in Bawarchi Biryani Combo [Ref: cmp_101]" -> "cmp_101"
  */
export function extractCampaignRef(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\[Ref:\s*([a-zA-Z0-9_\-]+)\]/i);
  return match ? match[1] : null;
}

/**
  * Process inbound message event idempotently and update campaign performance inquiry metrics.
  */
export async function processInboundMessageEvent(
  message: WhatsAppInboundMessage,
  phoneNumberId: string
): Promise<{ success: boolean; campaignId?: string; deduplicated?: boolean }> {
  const eventId = message.id;
  const eventRef = db.collection('inbound_events').doc(eventId);

  // Idempotency check: process each message ID exactly once
  const eventSnap = await eventRef.get();
  if (eventSnap.exists) {
    logger.info(`Inbound message ${eventId} already processed. Skipping.`);
    return { success: true, deduplicated: true };
  }

  const campaignId = extractCampaignRef(message.text?.body);
  const now = new Date().toISOString();

  await eventRef.set({
    eventId,
    from: message.from,
    phoneNumberId,
    text: message.text?.body || null,
    campaignId: campaignId || null,
    processedAt: now,
  });

  if (campaignId) {
    // Attempt to locate matching campaign to record verified outcome
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    let businessId = 'default_business';
    if (campaignDoc.exists) {
      businessId = campaignDoc.data()?.businessId || 'default_business';
    }

    const currentPeriod = now.substring(0, 7); // YYYY-MM
    const perfRef = db
      .collection('campaign_performance')
      .doc(`${campaignId}_${currentPeriod}`);

    await perfRef.set(
      {
        campaignId,
        businessId,
        period: currentPeriod,
        inquiries: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );

    logger.info(`Attributed inbound inquiry to campaign ${campaignId} (business: ${businessId})`);
  }

  return { success: true, campaignId: campaignId || undefined, deduplicated: false };
}
