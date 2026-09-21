import type { ReelDurationSeconds, ReelGoal, ReelStyle } from '@/types';

export interface ReelGoalOption {
  value: ReelGoal;
  label: string;
  description: string;
}

export const REEL_GOAL_OPTIONS: ReelGoalOption[] = [
  {
    value: 'food_showcase',
    label: 'Food Showcase',
    description: 'Show the food/product attractively',
  },
  {
    value: 'behind_the_scenes',
    label: 'Behind the Scenes',
    description: 'Show preparation, cooking, staff, process, etc.',
  },
  {
    value: 'offer_promotion',
    label: 'Offer / Promotion',
    description: 'Focus on an offer or deal',
  },
  {
    value: 'new_product',
    label: 'New Product',
    description: 'Launch a new dish/product/service',
  },
  {
    value: 'local_attraction',
    label: 'Local Attraction',
    description: 'Focus on why nearby customers should visit/order',
  },
  {
    value: 'surprise_me',
    label: 'Surprise Me',
    description: 'Let Mitra decide based on uploaded clips and business context',
  },
];

export interface ReelStyleOption {
  value: ReelStyle;
  label: string;
  description: string;
}

export const REEL_STYLE_OPTIONS: ReelStyleOption[] = [
  {
    value: 'fast_engaging',
    label: 'Fast & Engaging',
    description: 'Fast cuts and energetic pacing',
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'Slower, polished, visually focused',
  },
  {
    value: 'local_fun',
    label: 'Local & Fun',
    description: 'More conversational/local language',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Clean text and simple transitions',
  },
  {
    value: 'cinematic',
    label: 'Cinematic',
    description: 'More dramatic pacing',
  },
];

export interface ReelDurationOption {
  value: ReelDurationSeconds;
  label: string;
}

export const REEL_DURATION_OPTIONS: ReelDurationOption[] = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
];

export const REEL_DEFAULT_DURATION_SECONDS: ReelDurationSeconds = 30;

export const REEL_STATUS_COPY: Record<string, { title: string; subtitle: string }> = {
  draft: { title: 'Uploading clips...', subtitle: 'Getting your footage ready' },
  uploading: { title: 'Uploading clips...', subtitle: 'Getting your footage ready' },
  analyzing: { title: 'Mitra is watching your clips...', subtitle: 'Finding the best moments' },
  planning: { title: 'Building your Reel...', subtitle: 'Creating the story' },
  rendering: { title: 'Editing your Reel...', subtitle: 'Adding captions and transitions' },
  completed: { title: 'Your Reel is ready 🎉', subtitle: 'Ready to download and post' },
  failed: { title: "Mitra couldn't build the Reel this time.", subtitle: '' },
};
