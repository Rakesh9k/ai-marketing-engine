import type { CreativeFormat, CreativeTemplate } from './types';

export const CREATIVE_FORMATS: ReadonlyArray<{
  value: CreativeFormat;
  label: string;
  dimensions: string;
  icon: string;
}> = [
  { value: 'instagram_post', label: 'Instagram Post', dimensions: '1080 × 1080', icon: '📷' },
  { value: 'instagram_story', label: 'Instagram Story', dimensions: '1080 × 1920', icon: '📱' },
  { value: 'whatsapp_status', label: 'WhatsApp Status', dimensions: '1080 × 1920', icon: '💬' },
  { value: 'facebook_post', label: 'Facebook Post', dimensions: '1200 × 630', icon: '👍' },
  { value: 'google_business', label: 'Google Business', dimensions: '1024 × 768', icon: '📍' },
  { value: 'flyer', label: 'Flyer / Banner', dimensions: '1200 × 1600', icon: '📄' },
  { value: 'festival', label: 'Festival Poster', dimensions: '1080 × 1080', icon: '🎉' },
  { value: 'menu', label: 'Menu Promotion', dimensions: '1080 × 1350', icon: '🍽️' },
];

export const POPULAR_TEMPLATES: CreativeTemplate[] = [
  {
    id: 'tpl_biryani_weekend',
    name: 'Weekend Special Biryani',
    type: 'poster',
    format: 'instagram_post',
    vertical: 'restaurant',
    category: 'offer',
    previewUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    description: 'High-converting weekend combo discount layout.',
    badge: 'Popular',
    defaultHeadline: 'Weekend Special Family Biryani',
    defaultOffer: '20% OFF on Family Combos',
  },
  {
    id: 'tpl_good_food',
    name: 'Good Food Good Mood',
    type: 'image',
    format: 'instagram_story',
    vertical: 'restaurant',
    category: 'product',
    previewUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    description: 'Vibrant product aesthetic featuring fresh dishes.',
    badge: 'Trending',
    defaultHeadline: 'Good Food Good Mood',
  },
  {
    id: 'tpl_fresh_healthy',
    name: 'Fresh & Healthy Choice',
    type: 'image',
    format: 'whatsapp_status',
    vertical: 'restaurant',
    category: 'product',
    previewUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
    description: 'Clean green theme highlighting organic ingredients.',
    defaultHeadline: 'Taste the Freshness Today',
  },
  {
    id: 'tpl_grand_opening',
    name: 'Grand Opening Offer',
    type: 'poster',
    format: 'facebook_post',
    vertical: 'restaurant',
    category: 'announcement',
    previewUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    description: 'Bold promotional poster for launches and expansions.',
    badge: 'New',
    defaultHeadline: 'Grand Opening Special Offers',
    defaultOffer: 'Buy 1 Get 1 Free',
  },
  {
    id: 'tpl_ugadi_festive',
    name: 'Happy Ugadi Celebration',
    type: 'poster',
    format: 'festival',
    vertical: 'restaurant',
    category: 'festival',
    previewUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80',
    description: 'Traditional festive poster with festive greetings.',
    badge: 'Festive',
    defaultHeadline: 'Happy Ugadi & Festive Delights',
  },
  {
    id: 'tpl_menu_showcase',
    name: 'Bestseller Menu Showcase',
    type: 'poster',
    format: 'menu',
    vertical: 'restaurant',
    category: 'menu',
    previewUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    description: 'Editorial menu layout highlighting chef specials.',
    defaultHeadline: 'Our Bestseller Specials',
  },
];
