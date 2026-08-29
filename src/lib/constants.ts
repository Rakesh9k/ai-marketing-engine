export const CAMPAIGN_OBJECTIVES = [
  { value: 'weekend_offer', label: 'Weekend Offer' },
  { value: 'new_dish', label: 'New Dish Launch' },
  { value: 'festival', label: 'Festival Special' },
  { value: 'discount', label: 'Discount / Combo' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
] as const;

export const OFFER_TYPES = [
  { value: 'percentage', label: 'Percentage Discount' },
  { value: 'fixed', label: 'Fixed Amount Discount' },
  { value: 'bogo', label: 'Buy One Get One' },
  { value: 'combo', label: 'Combo Bundle' },
  { value: 'free_delivery', label: 'Free Delivery' },
  { value: 'loyalty', label: 'Loyalty Reward' },
] as const;

export const CTA_TYPES = [
  { value: 'order_whatsapp', label: 'Order on WhatsApp' },
  { value: 'book_table', label: 'Book Table' },
  { value: 'view_menu', label: 'View Menu' },
  { value: 'call_now', label: 'Call Now' },
  { value: 'get_directions', label: 'Get Directions' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te_en', label: 'Telugu + English' },
  { value: 'hi_en', label: 'Hindi + English' },
] as const;

export const REGIONAL_STYLES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'hyderabadi', label: 'Hyderabadi' },
  { value: 'telangana', label: 'Telangana' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'kolkata', label: 'Kolkata' },
] as const;

export const BRAND_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'premium', label: 'Premium' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'modern', label: 'Modern' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'casual', label: 'Casual' },
  { value: 'bold', label: 'Bold' },
] as const;

export const CAMPAIGN_STYLES = [
  { value: 'funny', label: 'Funny' },
  { value: 'quirky', label: 'Quirky' },
  { value: 'sarcastic', label: 'Sarcastic' },
  { value: 'dark_comedy', label: 'Dark Comedy' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'educational', label: 'Educational' },
  { value: 'youthful', label: 'Youthful' },
] as const;

export const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: 0, credits: 100 },
  { id: 'starter', name: 'Starter', price: 499, credits: 500 },
  { id: 'business', name: 'Business', price: 999, credits: 1200 },
  { id: 'agency', name: 'Agency', price: 2499, credits: 3000 },
] as const;

export const CREDIT_COSTS = {
  BASE_CAMPAIGN: 100,
  REGENERATION: 10,
  IMAGE_GENERATION: 20,
} as const;
