export type MascotState =
  | 'idle'
  | 'curious'
  | 'proud'
  | 'confused'
  | 'creating'
  | 'designer'
  | 'analyzing'
  | 'discovering'
  | 'directing'
  | 'publishing'
  | 'problem-solver'
  | 'helper'
  | 'phone'
  | 'product'
  | 'thumbs-up'
  | 'surprised'
  | 'love'
  | 'rocket'
  | 'sleeping'
  | 'success'
  | 'sad'
  | 'laptop'
  | 'newspaper'
  // Legacy aliases
  | 'point'
  | 'waving'
  | 'thinking'
  | 'cheer'
  | 'concerned'
  | 'explain'
  | 'remembering'
  | 'idea'
  | 'analyst'
  | 'hero-presenting'
  | 'cheer-chair'
  | 'thinking-chin';

export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';

export const MASCOT_SIZE_MAP: Record<MascotSize, number> = {
  xs: 40,
  sm: 64,
  md: 96,
  lg: 144,
  xl: 192,
  '2xl': 256,
  hero: 340,
};

export interface MascotStateMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
  defaultVariant: 'floating' | 'breathing' | 'popIn' | 'celebrate' | 'thinking' | 'success' | 'error' | 'static';
  meaning: string;
}

export const MASCOT_STATES: Record<MascotState, MascotStateMeta> = {
  idle: {
    src: '/brand/mascot/idle.png',
    width: 626,
    height: 1522,
    alt: 'Mitra ready to assist',
    defaultVariant: 'floating',
    meaning: 'Waiting / neutral / ready',
  },
  curious: {
    src: '/brand/mascot/curious.png',
    width: 714,
    height: 1520,
    alt: 'Mitra exploring marketing ideas',
    defaultVariant: 'thinking',
    meaning: 'Exploring an idea or recommendation',
  },
  proud: {
    src: '/brand/mascot/proud.png',
    width: 746,
    height: 1531,
    alt: 'Mitra proud of your achievement',
    defaultVariant: 'celebrate',
    meaning: 'User achieved a campaign milestone',
  },
  confused: {
    src: '/brand/mascot/confused.png',
    width: 653,
    height: 1513,
    alt: 'Mitra seeking clarification',
    defaultVariant: 'thinking',
    meaning: 'Incomplete or ambiguous business profile/instruction',
  },
  creating: {
    src: '/brand/mascot/creating.png',
    width: 1005,
    height: 1536,
    alt: 'Mitra generating campaign content',
    defaultVariant: 'breathing',
    meaning: 'Mitra is actively generating content or campaigns',
  },
  designer: {
    src: '/brand/mascot/designer.png',
    width: 1018,
    height: 1310,
    alt: 'Mitra crafting visual designs',
    defaultVariant: 'floating',
    meaning: 'Mitra is building visual concepts and templates',
  },
  analyzing: {
    src: '/brand/mascot/analyzing.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra analyzing performance data',
    defaultVariant: 'breathing',
    meaning: 'Mitra is studying performance analytics',
  },
  discovering: {
    src: '/brand/mascot/discovering.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra discovering marketing insights',
    defaultVariant: 'floating',
    meaning: 'Mitra found a business growth opportunity',
  },
  directing: {
    src: '/brand/mascot/directing.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra guiding creative strategy',
    defaultVariant: 'floating',
    meaning: 'Mitra guiding campaign direction',
  },
  publishing: {
    src: '/brand/mascot/publishing.png',
    width: 1138,
    height: 1285,
    alt: 'Mitra preparing content for launch',
    defaultVariant: 'popIn',
    meaning: 'Content ready to publish',
  },
  'problem-solver': {
    src: '/brand/mascot/problem-solver.png',
    width: 1200,
    height: 1232,
    alt: 'Mitra troubleshooting an issue',
    defaultVariant: 'error',
    meaning: 'Mitra helping recover from a generation problem',
  },
  helper: {
    src: '/brand/mascot/helper.png',
    width: 1157,
    height: 1280,
    alt: 'Mitra providing guidance',
    defaultVariant: 'floating',
    meaning: 'Contextual assistance and tooltips',
  },
  phone: {
    src: '/brand/mascot/phone.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra with mobile preview',
    defaultVariant: 'floating',
    meaning: 'WhatsApp & mobile social publishing',
  },
  product: {
    src: '/brand/mascot/product.png',
    width: 1071,
    height: 1277,
    alt: 'Mitra with product catalog item',
    defaultVariant: 'popIn',
    meaning: 'Product, food, or service image input',
  },
  'thumbs-up': {
    src: '/brand/mascot/thumbs-up.png',
    width: 1152,
    height: 1281,
    alt: 'Mitra confirming action',
    defaultVariant: 'celebrate',
    meaning: 'Action confirmed successfully',
  },
  surprised: {
    src: '/brand/mascot/surprised.png',
    width: 997,
    height: 1284,
    alt: 'Mitra surprised by insight',
    defaultVariant: 'popIn',
    meaning: 'Unusual insight or strong opportunity discovered',
  },
  love: {
    src: '/brand/mascot/love.png',
    width: 1115,
    height: 1284,
    alt: 'Mitra sharing appreciation',
    defaultVariant: 'celebrate',
    meaning: 'Saved content or favorite creative',
  },
  rocket: {
    src: '/brand/mascot/rocket.png',
    width: 1185,
    height: 1281,
    alt: 'Mitra launching campaign growth',
    defaultVariant: 'celebrate',
    meaning: 'Growth recommendations & plan upgrade',
  },
  sleeping: {
    src: '/brand/mascot/sleeping.png',
    width: 1200,
    height: 1144,
    alt: 'Mitra resting',
    defaultVariant: 'breathing',
    meaning: 'Inactive or empty state waiting for action',
  },
  success: {
    src: '/brand/mascot/success.png',
    width: 917,
    height: 1522,
    alt: 'Mitra celebrating success',
    defaultVariant: 'success',
    meaning: 'Major milestone or workflow completed',
  },
  sad: {
    src: '/brand/mascot/sad.png',
    width: 775,
    height: 1284,
    alt: 'Mitra apologetic',
    defaultVariant: 'error',
    meaning: 'Generation failure or unrecoverable error',
  },
  laptop: {
    src: '/brand/mascot/laptop.png',
    width: 1200,
    height: 1200,
    alt: 'Mitra working at laptop',
    defaultVariant: 'breathing',
    meaning: 'AI workspace processing',
  },
  newspaper: {
    src: '/brand/mascot/newspaper.png',
    width: 929,
    height: 1254,
    alt: 'Mitra reviewing market trends',
    defaultVariant: 'floating',
    meaning: 'Marketing insights & research signals',
  },
  // Legacy aliases mapped to primary assets
  point: {
    src: '/brand/mascot/point.png',
    width: 965,
    height: 1532,
    alt: 'Mitra pointing to key feature',
    defaultVariant: 'floating',
    meaning: 'Guiding user attention',
  },
  waving: {
    src: '/brand/mascot/waving.png',
    width: 918,
    height: 1530,
    alt: 'Mitra waving welcome',
    defaultVariant: 'floating',
    meaning: 'Friendly greeting',
  },
  thinking: {
    src: '/brand/mascot/thinking.png',
    width: 816,
    height: 1535,
    alt: 'Mitra contemplating strategy',
    defaultVariant: 'thinking',
    meaning: 'Strategic thought',
  },
  cheer: {
    src: '/brand/mascot/cheer.png',
    width: 1157,
    height: 1359,
    alt: 'Mitra cheering',
    defaultVariant: 'celebrate',
    meaning: 'Cheering achievement',
  },
  concerned: {
    src: '/brand/mascot/concerned.png',
    width: 775,
    height: 1284,
    alt: 'Mitra concerned',
    defaultVariant: 'error',
    meaning: 'Validation error',
  },
  explain: {
    src: '/brand/mascot/explain.png',
    width: 1157,
    height: 1280,
    alt: 'Mitra explaining concept',
    defaultVariant: 'floating',
    meaning: 'Explaining a feature',
  },
  remembering: {
    src: '/brand/mascot/remembering.png',
    width: 816,
    height: 1535,
    alt: 'Mitra recalling context',
    defaultVariant: 'thinking',
    meaning: 'Organizing business brain data',
  },
  idea: {
    src: '/brand/mascot/idea.png',
    width: 714,
    height: 1520,
    alt: 'Mitra inspired with idea',
    defaultVariant: 'popIn',
    meaning: 'New marketing idea',
  },
  analyst: {
    src: '/brand/mascot/analyst.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra inspecting data',
    defaultVariant: 'breathing',
    meaning: 'Analytics dashboard overview',
  },
  'hero-presenting': {
    src: '/brand/mascot/hero-presenting.png',
    width: 1200,
    height: 1260,
    alt: 'Mitra presenting studio',
    defaultVariant: 'floating',
    meaning: 'Creative studio hero',
  },
  'cheer-chair': {
    src: '/brand/mascot/cheer-chair.png',
    width: 1157,
    height: 1359,
    alt: 'Mitra cheering',
    defaultVariant: 'celebrate',
    meaning: 'Creative studio callout',
  },
  'thinking-chin': {
    src: '/brand/mascot/thinking-chin.png',
    width: 816,
    height: 1535,
    alt: 'Mitra in deep thought',
    defaultVariant: 'thinking',
    meaning: 'Deep strategic planning',
  },
};
