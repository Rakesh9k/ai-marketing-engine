import type { MitraMascotPose, MitraMascotSize } from './MitraMascot';

/**
 * The single source of truth for where Mitra appears and which pose it
 * wears there. This exists so the mascot system stays a small, deliberate
 * set of moments instead of a cartoon sprinkled on every screen — before
 * adding a new entry, ask the questions in the design brief: why is Mitra
 * here, what is it doing, would removing it make the screen worse?
 *
 * Not every screen needs an entry. Screens with no entry should not show
 * the mascot at all.
 *
 * `implemented: false` entries are intentionally reserved, not aspirational
 * clutter — they document a moment this brief calls for that currently has
 * no real screen to attach to (no analytics page, no standalone Business
 * Brain page exist yet). Don't build a screen just to use one; wire it in
 * when that screen is built for its own reasons.
 */
export interface MascotPlacement {
  pose: MitraMascotPose;
  size: MitraMascotSize;
  /** One line describing what triggers this moment. */
  trigger: string;
  /** Where this actually lives, once implemented. */
  screen: string;
  implemented: boolean;
}

export const MASCOT_PLACEMENT: Record<string, MascotPlacement> = {
  'dashboard.greeting': {
    pose: 'curious',
    size: 'sm',
    trigger: 'Dashboard load, has at least one business — "what should we create today?"',
    screen: 'src/app/dashboard/page.tsx',
    implemented: true,
  },
  'dashboard.no-campaigns': {
    pose: 'point',
    size: 'sm',
    trigger: 'Recent Campaigns panel, selected business has no campaigns yet',
    screen: 'src/app/dashboard/page.tsx',
    implemented: true,
  },
  'dashboard.error': {
    pose: 'concerned',
    size: 'md',
    trigger: 'Dashboard data failed to load',
    screen: 'src/app/dashboard/page.tsx',
    implemented: true,
  },
  'campaign.list.empty': {
    pose: 'point',
    size: 'lg',
    trigger: 'Campaigns list, selected business has no campaigns yet',
    screen: 'src/app/campaigns/page.tsx',
    implemented: true,
  },
  'campaign.wizard.objective': {
    pose: 'curious',
    size: 'sm',
    trigger: 'Wizard step 1 (Objective), before an objective is chosen',
    screen: 'src/features/campaign/components/CampaignWizard.tsx',
    implemented: true,
  },
  'campaign.wizard.objective-set': {
    pose: 'idea',
    size: 'sm',
    trigger: 'Wizard step 1 (Objective), after an objective is chosen',
    screen: 'src/features/campaign/components/CampaignWizard.tsx',
    implemented: true,
  },
  'campaign.wizard.review': {
    pose: 'idea',
    size: 'sm',
    trigger: 'Wizard step 8 (Review & Generate), before submitting',
    screen: 'src/features/campaign/components/CampaignWizard.tsx',
    implemented: true,
  },
  'campaign.generating': {
    pose: 'thinking',
    size: 'sm',
    trigger: 'AI generation in progress',
    screen: 'src/features/campaign/components/GenerationProgress.tsx',
    // Deliberately NOT used here: this screen already has an intentional,
    // documented choice to show MitraMark's own loading state instead of a
    // second mascot indicator, to avoid a redundant spinner. Keep the M
    // mark as sole indicator during generation — see that file's comment.
    implemented: false,
  },
  'campaign.result.created': {
    pose: 'cheer',
    size: 'sm',
    trigger: 'Campaign detail page, immediately after generation completes (one-time banner)',
    screen: 'src/app/campaigns/[campaignId]/page.tsx',
    implemented: true,
  },
  'campaign.error': {
    pose: 'concerned',
    size: 'md',
    trigger: 'Campaign detail failed to load (network failure or not found)',
    screen: 'src/app/campaigns/[campaignId]/page.tsx',
    implemented: true,
  },
  'products.empty': {
    pose: 'explain',
    size: 'md',
    trigger: 'No products added yet for the selected business',
    screen: 'src/app/products/page.tsx',
    implemented: true,
  },
  'onboarding.welcome': {
    pose: 'point',
    size: 'lg',
    trigger: 'Onboarding step 1 — welcome',
    screen: 'src/app/onboarding/page.tsx',
    implemented: true,
  },
  'onboarding.listening': {
    pose: 'curious',
    size: 'sm',
    trigger: 'Onboarding step 2 — asking where the business is based',
    screen: 'src/app/onboarding/page.tsx',
    implemented: true,
  },
  'onboarding.learning': {
    pose: 'remembering',
    size: 'sm',
    trigger: 'Onboarding step 4 — marketing preferences, organizing what it now knows',
    screen: 'src/app/onboarding/page.tsx',
    implemented: true,
  },
  'onboarding.ready': {
    pose: 'cheer',
    size: 'lg',
    trigger: 'Onboarding complete, handing off to the dashboard',
    screen: 'src/app/onboarding/page.tsx',
    implemented: true,
  },
  'analytics.overview': {
    pose: 'analyst',
    size: 'sm',
    trigger:
      'Analytics dashboard header, every visit (real aggregated data, not a fabricated insight)',
    screen: 'src/app/analytics/page.tsx',
    implemented: true,
  },
  'analytics.empty': {
    pose: 'discovering',
    size: 'md',
    trigger: 'Analytics dashboard, business has zero events in the selected time range',
    screen: 'src/app/analytics/page.tsx',
    implemented: true,
  },
  'analytics.recommendation': {
    pose: 'discovering',
    size: 'md',
    // Deliberately NOT implemented: this would be a derived, data-backed
    // insight ("weekend campaigns perform better"), and no such analysis
    // exists anywhere in the codebase — building this UI slot without a
    // real recommendation engine behind it would mean fabricating what it
    // shows, which Phase 32 explicitly prohibits. Revisit only once a real
    // insight-generation capability exists to back it.
    trigger: 'A fresh, data-backed recommendation is surfaced',
    screen: 'no screen exists yet — no recommendation engine exists to back this',
    implemented: false,
  },
  'business-brain.overview': {
    pose: 'remembering',
    size: 'md',
    trigger: '"Mitra knows your business" — a dedicated Business Brain view',
    screen: 'no standalone screen exists yet (data lives on Business.businessBrain)',
    implemented: false,
  },
  'campaign.creative-directions': {
    pose: 'designer',
    size: 'md',
    trigger: 'Choosing between distinct generated creative directions',
    screen: 'no screen exists yet (wizard has no separate creative-direction chooser)',
    implemented: false,
  },
  'help.tooltip': {
    pose: 'point',
    size: 'sm',
    trigger: 'First-time feature discovery / guided tooltip',
    screen: 'no screen exists yet',
    implemented: false,
  },
} as const;

export type MascotPlacementKey = keyof typeof MASCOT_PLACEMENT;
