'use client';

import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { setPaddleCustomer } from '@/lib/paddle/initPaddle';

/**
 * Keeps Paddle.js (Paddle Retain `pwCustomer`) in step with the signed-in user.
 *
 * The Paddle customer ID is written to users/{uid}.paddleCustomerId by the server the first time
 * the user starts a checkout; users who have not checked out yet simply have none. It is cleared
 * on sign-out. Failures are swallowed: Retain is an enhancement and must never break billing.
 */
export function useSyncPaddleCustomer(uid: string | undefined): void {
  useEffect(() => {
    if (!uid) {
      setPaddleCustomer(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        const snap = await getDoc(doc(db, 'users', uid));
        if (cancelled) return;
        setPaddleCustomer(snap.exists() ? (snap.data()['paddleCustomerId'] as string) : undefined);
      } catch {
        /* Retain is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);
}
