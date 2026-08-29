import { user } from 'firebase-functions/v1/auth';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';
import { getEnvConfig } from '../../config/env';
import { PRICING } from '../../config/pricing';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const db = admin.firestore();

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function getPeriodBoundaries(): {
  periodStart: admin.firestore.Timestamp;
  periodEnd: admin.firestore.Timestamp;
} {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    periodStart: admin.firestore.Timestamp.fromDate(periodStart),
    periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
  };
}

export const onUserCreatedHandler = user().onCreate(async (userRecord) => {
  const { logger, startTime } = logFunctionStart('onUserCreated', { userId: userRecord.uid });

  try {
    const userId = userRecord.uid;
    const email = userRecord.email || '';
    const displayName = userRecord.displayName || '';
    const photoURL = userRecord.photoURL || '';
    const phoneNumber = userRecord.phoneNumber || '';
    const { periodStart, periodEnd } = getPeriodBoundaries();
    const usageId = `${userId}_${periodStart.toDate().toISOString().split('T')[0]}`;

    const freePlanCredits = PRICING.subscriptionTiers.free.monthlyCredits;
    const subscriptionId = uuidv7();

    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(userId);
      tx.set(userRef, {
        userId,
        email,
        phone: phoneNumber,
        displayName,
        photoURL,
        role: 'user',
        businessIds: [],
        agencyId: null,
        subscriptionId,
        settings: {
          notifications: true,
          language: 'en',
          timezone: 'Asia/Kolkata',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        deletedAt: null,
      });

      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      tx.set(subscriptionRef, {
        subscriptionId,
        userId,
        planId: 'free',
        status: 'active',
        razorpaySubscriptionId: null,
        razorpayCustomerId: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        creditsIncluded: freePlanCredits,
        creditsUsed: 0,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const usageRef = db.collection('usage').doc(usageId);
      tx.set(usageRef, {
        usageId,
        userId,
        periodStart,
        periodEnd,
        planId: 'free',
        creditsIncluded: freePlanCredits,
        campaignsCreated: 0,
        creditsUsed: 0,
        imagesGenerated: 0,
        copyGenerations: 0,
        regenerations: 0,
        failedGenerations: 0,
        updatedAt: serverTimestamp(),
      });

      const welcomeTransactionRef = db.collection('transactions').doc(uuidv7());
      tx.set(welcomeTransactionRef, {
        transactionId: welcomeTransactionRef.id,
        userId,
        type: 'grant',
        amount: freePlanCredits,
        currency: 'INR',
        balanceAfter: freePlanCredits,
        description: 'Welcome credits (Free tier monthly allowance)',
        razorpayPaymentId: null,
        razorpayOrderId: null,
        razorpaySubscriptionId: null,
        status: 'completed',
        metadata: { planId: 'free', source: 'welcome' },
        createdAt: serverTimestamp(),
      });
    });

    try {
      await admin.auth().setCustomUserClaims(userId, {
        role: 'user',
        businessIds: [],
      });
    } catch (claimsError) {
      logger.warn('Failed to set custom claims', { error: claimsError });
    }

    logFunctionComplete(logger, startTime, { success: true, userId });
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    throw error;
  }
});

export const onUserDeletedHandler = user().onDelete(async (userRecord) => {
  const { logger, startTime } = logFunctionStart('onUserDeleted', { userId: userRecord.uid });

  try {
    const userId = userRecord.uid;

    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const businessIds = userData['businessIds'] || [];

      for (const businessId of businessIds) {
        await db.collection('businesses').doc(businessId).update({
          status: 'archived',
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await db.collection('users').doc(userId).update({
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    logFunctionComplete(logger, startTime, { success: true, userId });
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    throw error;
  }
});
