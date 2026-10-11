'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PhonePrompt } from './useCashfreeCheckout';

/**
 * Asks for the customer's real mobile number, which Cashfree requires to take the payment. Nothing is filled in
 * for them. The number is saved to their account after the order is created so they are not asked again.
 */
export function CheckoutPhonePrompt({
  prompt,
  busy,
  onSubmit,
  onCancel,
}: {
  prompt: PhonePrompt | null;
  busy: boolean;
  onSubmit: (phone: string) => void;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState('');
  if (!prompt) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-phone-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <form
        className="bg-surface w-full max-w-md space-y-4 rounded-lg p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(phone);
        }}
      >
        <h2 id="checkout-phone-title" className="text-text-primary text-lg font-semibold">
          Your mobile number
        </h2>
        <p className="text-text-secondary text-sm">
          Our payment partner needs a mobile number to take the payment. We use it only for this
          payment and its receipt.
        </p>
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={prompt.error ?? undefined}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Continue to payment
          </Button>
        </div>
      </form>
    </div>
  );
}
