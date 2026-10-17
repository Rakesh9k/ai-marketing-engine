/**
 * Public business identity shown on the marketing/legal pages. Values are the ones the owner
 * submitted for payment-gateway verification; do not add registration numbers (GST/CIN/LLPIN)
 * here until the owner confirms them (see legalPages.test.tsx).
 */
export const BUSINESS_IDENTITY = {
  product: 'Mitra by BrainWise',
  tradeName: 'Brainwise Solutions',
  structure: 'sole proprietorship',
  proprietor: 'VISHESH KAKAR',
  email: 'vishesh.kakar@gmail.com',
  phone: '8688693097',
  phoneHref: 'tel:+918688693097',
  address: 'Aliabad Jhanda, Charminar, Hyderabad, Telangana – 500053, India',
  supportEmail: 'support@brain-wise.com',
  description:
    'AI-powered marketing tools for local businesses: create campaigns and marketing content such as posts, captions, offers and WhatsApp-ready messages.',
} as const;
