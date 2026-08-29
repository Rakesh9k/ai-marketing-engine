export type UUID = string & { readonly __brand: unique symbol };

export function generateUUID(): UUID {
  return crypto.randomUUID() as UUID;
}

export type ISODateString = string & { readonly __brand: unique symbol };

export function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export type Email = string & { readonly __brand: unique symbol };

export type PhoneNumber = string & { readonly __brand: unique symbol };

export type URLString = string & { readonly __brand: unique symbol };

export type Currency = 'INR';

export interface Money {
  amount: number;
  currency: Currency;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
