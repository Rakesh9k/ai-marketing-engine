import type { CreativeTemplate } from '../types';

/**
 * Phase 4 — the first production Creative Template library (10 POST + 8
 * REEL). Phase 5 — expanded the REEL library to 20 canonical templates:
 * three Phase 4 Reel templates were reconciled in place rather than
 * duplicated (reel-product-reveal refined to a tease/reveal/close-up
 * grammar; reel-offer-drop retired in favor of the more narratively
 * complete reel-offer; reel-local-relatable renamed/refined to
 * reel-relatable-situation to sit alongside the newly distinct
 * reel-local-comedy), and the remaining Phase 4 Reel templates
 * (reel-problem-solution, reel-before-after, reel-behind-scenes,
 * reel-customer-proof, reel-new-launch) were kept unchanged. See
 * docs/CREATIVE_INTELLIGENCE_PHASE_4_BUILTIN_TEMPLATES.md and
 * docs/CREATIVE_INTELLIGENCE_PHASE_5_REEL_TEMPLATES.md for the full
 * reconciliation record.
 *
 * Mirrors config/verticals.ts's and config/reels.ts's role: the ONE
 * static source of built-in domain data, validated by
 * creativeTemplateLibrary.test.ts against the Phase 3 schema
 * (creativeTemplate.ts). This is a static collection only — no
 * lookup/selection/ranking function lives here. That is explicitly a
 * later phase (Template Registry / Template Selector).
 *
 * Every template describes reusable creative GRAMMAR only. None of them
 * contain a real business name, price, offer, review, logo, or any other
 * business/brand-specific fact — those are supplied at generation time
 * (a later phase) from Business Brain and BrandCreativeContext, and
 * remain subject to Truth Check exactly as they are today.
 */

const BROAD_VERTICALS: CreativeTemplate['compatibleVerticals'] = [
  'restaurant',
  'salon',
  'real_estate',
  // The generic vertical shares the broad, industry-agnostic templates.
  'general',
];

export const BUILTIN_CREATIVE_TEMPLATES: CreativeTemplate[] = [
  // ── POST templates ────────────────────────────────────────────────────
  {
    id: 'post-product-hero',
    name: 'Product Hero',
    description:
      'Makes the product the visual and semantic star: a strong hook, the product itself, its key benefit, and a direct CTA.',
    type: 'post',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        { id: 'hook', role: 'hook', purpose: 'Capture attention immediately', required: true },
        {
          id: 'product',
          role: 'product',
          purpose: 'Make the product the visual focus',
          required: true,
        },
        {
          id: 'benefit',
          role: 'benefit',
          purpose: 'State the key benefit of the product',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'low' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-offer',
    name: 'Offer',
    description:
      'Leads with attention, states the offer clearly, grounds it in the product, adds urgency, and closes on a CTA.',
    type: 'post',
    objectives: ['promotion', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        { id: 'hook', role: 'hook', purpose: 'Capture attention immediately', required: true },
        {
          id: 'offer',
          role: 'offer',
          purpose: 'State the value proposition clearly',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Ground the offer in the actual product',
          required: true,
        },
        { id: 'urgency', role: 'urgency', purpose: 'Give a reason to act now', required: false },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'high-contrast' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
    ],
    constraints: { type: 'post', minSections: 4, maxSections: 6, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-menu-spotlight',
    name: 'Menu Spotlight',
    description:
      'Puts a single item in the spotlight: the product, why it matters, its price, and a CTA.',
    type: 'post',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: ['restaurant'],
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'product',
          role: 'product',
          purpose: 'Show the single featured item',
          required: true,
        },
        { id: 'benefit', role: 'benefit', purpose: 'Explain why it matters', required: true },
        { id: 'offer', role: 'offer', purpose: 'Disclose the price', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'low' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-local-relatable',
    name: 'Local / Relatable',
    description:
      'Opens with a local, relatable observation, connects it with warmth or humor, then brings in the product and a CTA.',
    type: 'post',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'context',
          role: 'context',
          purpose: 'Open with a local, relatable observation',
          required: true,
        },
        {
          id: 'emotion',
          role: 'emotion',
          purpose: 'Build a warm or humorous connection',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Bring the product into the moment',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'editorial' },
    adaptationRules: [],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-festival-occasion',
    name: 'Festival / Occasion',
    description:
      'Connects a relevant occasion to the business or product, optionally with an offer, closing on a CTA.',
    type: 'post',
    objectives: ['promotion', 'engagement'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'context',
          role: 'context',
          purpose: 'Establish the relevant occasion',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Connect the occasion to the business/product',
          required: true,
        },
        {
          id: 'offer',
          role: 'offer',
          purpose: 'Present an occasion-tied offer, if one exists',
          required: false,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'editorial' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
    ],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-new-launch',
    name: 'New Launch',
    description:
      'Announces something new, reveals the product, states what makes it different, and closes on a CTA.',
    type: 'post',
    objectives: ['launch', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Announce that something new is here',
          required: true,
        },
        { id: 'product', role: 'product', purpose: 'Reveal the new product', required: true },
        {
          id: 'differentiator',
          role: 'differentiator',
          purpose: 'State what makes it different',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'low' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-problem-solution',
    name: 'Problem → Solution',
    description:
      'Opens with a relatable problem, makes it feel relevant, positions the product as the solution, states the benefit, and closes on a CTA.',
    type: 'post',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'problem',
          role: 'problem',
          purpose: 'Open with a relatable problem',
          required: true,
        },
        {
          id: 'agitation',
          role: 'emotion',
          purpose: 'Make the problem feel relevant and pressing',
          required: false,
        },
        {
          id: 'solution',
          role: 'product',
          purpose: 'Position the product as the solution',
          required: true,
        },
        { id: 'benefit', role: 'benefit', purpose: 'State the resulting benefit', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'editorial' },
    adaptationRules: [
      {
        id: 'include_proof_if_available',
        condition: { check: 'proofAvailable' },
        action: { action: 'include', role: 'proof' },
      },
    ],
    constraints: { type: 'post', minSections: 4, maxSections: 6, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-social-proof',
    name: 'Social Proof',
    description:
      'Builds trust with real evidence: a hook, verified proof if available, the product, why it matters, and a CTA.',
    type: 'post',
    objectives: ['conversion', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        { id: 'hook', role: 'hook', purpose: 'Capture attention immediately', required: true },
        {
          id: 'proof',
          role: 'social-proof',
          purpose: 'Show real, verified evidence — never fabricated',
          required: false,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Connect the evidence to the product/service',
          required: true,
        },
        { id: 'benefit', role: 'benefit', purpose: 'Explain why it matters', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'include_proof_if_available',
        condition: { check: 'proofAvailable' },
        action: { action: 'include', role: 'social-proof' },
      },
    ],
    constraints: { type: 'post', minSections: 4, maxSections: 5, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-differentiator',
    name: 'Differentiator',
    description:
      'Sets context, names the common expectation, states the real differentiator, shows the product, and closes on a CTA.',
    type: 'post',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        {
          id: 'context',
          role: 'context',
          purpose: 'Set the context the audience already expects',
          required: true,
        },
        {
          id: 'expectation',
          role: 'objection',
          purpose: 'Name the common expectation or assumption',
          required: true,
        },
        {
          id: 'differentiator',
          role: 'differentiator',
          purpose: 'State what is meaningfully different here',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Show the product embodying the difference',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'split-composition' },
    adaptationRules: [],
    constraints: { type: 'post', minSections: 4, maxSections: 6, maxTextDensity: 'medium' },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'post-question-engagement',
    name: 'Question / Engagement',
    description:
      'Opens with a hook, poses a question tied to the product, and closes with a CTA that invites interaction.',
    type: 'post',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'post',
      grammar: [
        { id: 'hook', role: 'hook', purpose: 'Capture attention immediately', required: true },
        {
          id: 'question',
          role: 'objection',
          purpose: 'Pose a question the audience will want to answer',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Ground the question in the product/context',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Invite comments, votes, or shares', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'minimal' },
    adaptationRules: [],
    constraints: { type: 'post', minSections: 3, maxSections: 5, maxTextDensity: 'low' },
    version: 1,
    active: true,
    source: 'system',
  },

  // ── REEL templates ───────────────────────────────────────────────────
  {
    // Phase 5 reconciliation: this definition replaces the Phase 4 version
    // in place (same id, same canonical template — not a duplicate). The
    // Phase 4 grammar (hook -> setup -> product -> benefit -> cta) was a
    // general product-led structure; Phase 5's brief asks specifically for
    // the reveal to be "the central dramatic moment" via tease -> reveal ->
    // close-up, a meaningfully more specific theatrical pattern for the
    // same "Product Reveal" concept, so the canonical template was
    // refined to match rather than creating a second, competing template.
    id: 'reel-product-reveal',
    name: 'Product Reveal',
    description:
      'Makes the product reveal the dramatic centerpiece of the reel: a hook, a visual tease, the reveal itself, a close-up payoff, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'visual_tease',
          role: 'setup',
          purpose: 'Build controlled anticipation before the reveal',
          required: true,
        },
        {
          id: 'reveal',
          role: 'product',
          purpose: 'Reveal the product as the primary visual payoff',
          required: true,
        },
        {
          id: 'close_up',
          role: 'benefit',
          purpose: 'Reinforce desirability with a close-up/detail emphasis',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    // Bumped from 1 -> 2 for the Phase 5 grammar refinement above.
    version: 2,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-before-after',
    name: 'Before / After',
    description:
      'Demonstrates a real transformation: a hook, the before state, the change in progress, the after result, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        { id: 'before', role: 'problem', purpose: 'Show the real starting state', required: true },
        {
          id: 'transformation',
          role: 'benefit',
          purpose: 'Show the change taking place',
          required: true,
        },
        { id: 'after', role: 'payoff', purpose: 'Show the real resulting state', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'image-led', composition: 'split-composition' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-problem-solution',
    name: 'Problem → Solution (Reel)',
    description:
      'Opens with a relatable problem, agitates it, positions the product as the solution, states the benefit, and closes on a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'problem',
          role: 'problem',
          purpose: 'Introduce a relatable problem',
          required: true,
        },
        {
          id: 'agitation',
          role: 'emotion',
          purpose: 'Make the problem feel relevant and pressing',
          required: false,
        },
        {
          id: 'solution',
          role: 'product',
          purpose: 'Position the product as the solution',
          required: true,
        },
        { id: 'benefit', role: 'benefit', purpose: 'State the resulting benefit', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'editorial' },
    adaptationRules: [
      {
        id: 'include_proof_if_available',
        condition: { check: 'proofAvailable' },
        action: { action: 'include', role: 'proof' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 5,
      maxSections: 7,
      minDurationSeconds: 20,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-behind-scenes',
    name: 'Behind the Scenes',
    description:
      'Shows authenticity and process: a hook, the process, the product/service, a human moment, a payoff, and a CTA.',
    type: 'reel',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'process',
          role: 'setup',
          purpose: 'Show the real process behind the work',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Connect the process to the product/service',
          required: true,
        },
        {
          id: 'human_moment',
          role: 'emotion',
          purpose: 'Show a genuine human moment',
          required: false,
        },
        { id: 'payoff', role: 'payoff', purpose: 'Deliver the satisfying result', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'image-led', composition: 'editorial' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 5,
      maxSections: 7,
      minDurationSeconds: 20,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    // Phase 5 reconciliation: replaces Phase 4's "Local Relatable"
    // (id: reel-local-relatable). The new 20-template brief separates a
    // universal/common-situation grammar (this one) from a specifically
    // comedic, joke-structured one (reel-local-comedy, below) — Phase 4's
    // template already WAS the general, non-joke-specific version, so it
    // is renamed/refined to the new canonical id and grammar rather than
    // kept as a third, overlapping template.
    id: 'reel-relatable-situation',
    name: 'Relatable Situation',
    description:
      'Builds on a common, universally relatable situation — not a specific local joke — and connects it to the business: situation, recognition, business connection, payoff, and a CTA.',
    type: 'reel',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'situation',
          role: 'context',
          purpose: 'Set up a common, widely relatable situation',
          required: true,
        },
        {
          id: 'recognition',
          role: 'emotion',
          purpose: 'Let the audience recognize themselves in it',
          required: true,
        },
        {
          id: 'business_connection',
          role: 'product',
          purpose: 'Connect the situation to the business',
          required: true,
        },
        {
          id: 'payoff',
          role: 'payoff',
          purpose: 'Deliver an emotional or humorous payoff',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'editorial' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-customer-proof',
    name: 'Customer Proof',
    description:
      'Uses authentic customer evidence: a hook, real customer proof, the product/service, why it matters, and a CTA.',
    type: 'reel',
    objectives: ['conversion', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'proof',
          role: 'social-proof',
          purpose: 'Show real, verified customer evidence — never fabricated',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Connect the evidence to the product/service',
          required: true,
        },
        { id: 'benefit', role: 'benefit', purpose: 'Explain why it matters', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'emphasize_proof_if_available',
        condition: { check: 'proofAvailable' },
        action: { action: 'emphasize', role: 'social-proof' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-new-launch',
    name: 'New Launch (Reel)',
    description:
      'Builds anticipation and reveals something new: a teaser, build-up, the reveal, the differentiator, and a CTA.',
    type: 'reel',
    objectives: ['launch', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'teaser',
          role: 'hook',
          purpose: 'Tease that something new is coming',
          required: true,
        },
        {
          id: 'build_up',
          role: 'setup',
          purpose: 'Build anticipation before the reveal',
          required: true,
        },
        { id: 'reveal', role: 'product', purpose: 'Reveal the new product', required: true },
        {
          id: 'differentiator',
          role: 'differentiator',
          purpose: 'State what makes it different',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },

  // ── REEL templates (Phase 5 additions) ──────────────────────────────────
  {
    id: 'reel-3-shot-food',
    name: '3-Shot Food Reel',
    description:
      'A fast, simple food reel built from three visual beats: hook, preparation, and the final product, closing on a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: ['restaurant'],
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Immediately establish attention — curiosity, desire, or sensory appeal',
          required: true,
        },
        {
          id: 'preparation',
          role: 'product',
          purpose: 'Show preparation, process, or product detail',
          required: true,
        },
        {
          id: 'final_product',
          role: 'payoff',
          purpose: 'Show the strongest final-product presentation as the visual payoff',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 3,
      maxSections: 5,
      minDurationSeconds: 10,
      maxDurationSeconds: 20,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-local-comedy',
    name: 'Local Comedy',
    description:
      'Uses a relatable local situation and a comedic beat to connect the product to the audience: situation, joke, product connection, punchline, and CTA.',
    type: 'reel',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'situation',
          role: 'context',
          purpose: 'Set up a relatable local situation',
          required: true,
        },
        {
          id: 'local_joke',
          role: 'emotion',
          purpose: 'Land a locally relatable comedic beat',
          required: true,
        },
        {
          id: 'product_connection',
          role: 'product',
          purpose: 'Connect the joke naturally to the product',
          required: true,
        },
        {
          id: 'punchline',
          role: 'closing',
          purpose: 'Land the comedic punchline as a decisive close',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-pov',
    name: 'POV',
    description:
      'Places the viewer inside a first-person scenario that resolves into the product: a POV hook, the scenario, the product, a payoff, and a CTA.',
    type: 'reel',
    objectives: ['engagement', 'awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'pov_hook',
          role: 'hook',
          purpose: "Immediately establish the viewer's first-person perspective",
          required: true,
        },
        {
          id: 'scenario',
          role: 'context',
          purpose: 'Build a short relatable situation',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Connect the scenario naturally to the product/service',
          required: true,
        },
        {
          id: 'payoff',
          role: 'payoff',
          purpose: 'Deliver the expected satisfying result',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'image-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-offer',
    name: 'Offer Reel',
    description:
      'A conversion-oriented reel built around a legitimate offer: a problem or desire, the offer reveal, the product, urgency, and a CTA.',
    type: 'reel',
    objectives: ['promotion', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'problem_desire',
          role: 'problem',
          purpose: 'Open with a relatable problem or desire',
          required: true,
        },
        {
          id: 'offer_reveal',
          role: 'offer',
          purpose: 'Reveal the actual offer as a major creative beat',
          required: true,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Support the offer with the product',
          required: true,
        },
        {
          id: 'urgency',
          role: 'urgency',
          purpose: 'Express legitimate urgency, if any exists',
          required: false,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'split-composition' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-cinematic-product',
    name: 'Cinematic Product',
    description:
      'A premium, atmosphere-led reel: mood, meaningful product details, the hero shot, a brand connection, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'atmosphere',
          role: 'context',
          purpose: 'Establish mood and visual world',
          required: true,
        },
        {
          id: 'product_details',
          role: 'differentiator',
          purpose: 'Highlight meaningful product details',
          required: true,
        },
        {
          id: 'hero_shot',
          role: 'product',
          purpose: 'Present the strongest product visual',
          required: true,
        },
        {
          id: 'brand',
          role: 'closing',
          purpose: 'Connect the product to the business identity',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'image-led', composition: 'hero-product' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 20,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },

  // ── REEL templates (Phase 5 — 20-template expansion) ────────────────────
  {
    id: 'reel-product-detail',
    name: 'Product Detail',
    description:
      'Showcases the small details that make a product desirable: a hook, two supporting details, the hero detail, product context, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: ['restaurant', 'salon'],
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'detail_1',
          role: 'benefit',
          purpose: 'Highlight a detail that shows value',
          required: true,
        },
        {
          id: 'detail_2',
          role: 'differentiator',
          purpose: 'Highlight a second, distinguishing detail',
          required: false,
        },
        {
          id: 'hero_detail',
          role: 'product',
          purpose: 'Present the strongest close-up/detail shot',
          required: true,
        },
        {
          id: 'product_context',
          role: 'context',
          purpose: 'Place the detail back in product context',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'product-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'prioritize_product_if_image_available',
        condition: { check: 'productImageAvailable' },
        action: { action: 'prioritize', role: 'product' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 5,
      maxSections: 7,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-limited-time-offer',
    name: 'Limited-Time Offer',
    description:
      'Creates urgency around a legitimate time-bound promotion: attention, the offer, deadline/availability, the product, urgency, and a CTA.',
    type: 'reel',
    objectives: ['promotion', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'attention',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        { id: 'offer', role: 'offer', purpose: 'State the offer', required: true },
        {
          id: 'deadline',
          role: 'urgency',
          purpose: 'State a real deadline or availability limit, only if one legitimately exists',
          required: false,
        },
        {
          id: 'product',
          role: 'product',
          purpose: 'Ground the offer in the product',
          required: true,
        },
        {
          id: 'urgency',
          role: 'urgency',
          purpose: 'Reinforce the reason to act now',
          required: false,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'high-contrast' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-bundle-combo',
    name: 'Bundle / Combo',
    description:
      'Presents multiple items as a single value proposition: a hook, two items, the bundle reveal, its value, and a CTA.',
    type: 'reel',
    objectives: ['promotion', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'item_1',
          role: 'product',
          purpose: 'Show the first item in the bundle',
          required: true,
        },
        {
          id: 'item_2',
          role: 'product',
          purpose: 'Show the second item in the bundle',
          required: true,
        },
        {
          id: 'bundle_reveal',
          role: 'offer',
          purpose: 'Reveal the items as a single bundled offer',
          required: true,
        },
        { id: 'value', role: 'benefit', purpose: 'State the value of the bundle', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'editorial' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 5,
      maxSections: 7,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-price-value',
    name: 'Price / Value',
    description:
      'Makes a legitimate price or value proposition easy to understand: a hook, the product/service, what the viewer gets, the price/value, and a CTA.',
    type: 'reel',
    objectives: ['conversion', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        { id: 'product', role: 'product', purpose: 'Show the product/service', required: true },
        {
          id: 'what_you_get',
          role: 'benefit',
          purpose: 'Explain what the viewer actually gets',
          required: true,
        },
        {
          id: 'price_value',
          role: 'offer',
          purpose: 'Disclose the price/value clearly',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'offer-led', composition: 'minimal' },
    adaptationRules: [
      {
        id: 'emphasize_offer_if_available',
        condition: { check: 'offerAvailable' },
        action: { action: 'emphasize', role: 'offer' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-customer-journey',
    name: 'Customer Journey',
    description:
      'Shows what a customer experiences from beginning to end: a need, discovery, the experience, the outcome, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        { id: 'need', role: 'problem', purpose: 'Establish the customer need', required: true },
        {
          id: 'discovery',
          role: 'context',
          purpose: 'Show how the customer discovers the business',
          required: true,
        },
        {
          id: 'experience',
          role: 'product',
          purpose: 'Show the actual experience',
          required: true,
        },
        { id: 'outcome', role: 'payoff', purpose: 'Show the real result/outcome', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'split-composition' },
    adaptationRules: [
      {
        id: 'include_proof_if_available',
        condition: { check: 'proofAvailable' },
        action: { action: 'include', role: 'social-proof' },
      },
    ],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-how-it-works',
    name: 'How It Works',
    description:
      'Explains a product or service simply: a hook, a flexible number of process steps, the result, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'conversion'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'step_1',
          role: 'setup',
          purpose: 'Show the first step of the process',
          required: true,
        },
        {
          id: 'step_2',
          role: 'setup',
          purpose: 'Show a second step, if the process has one',
          required: false,
        },
        {
          id: 'step_3',
          role: 'setup',
          purpose: 'Show a third step, if the process has one',
          required: false,
        },
        { id: 'result', role: 'payoff', purpose: 'Show the resulting outcome', required: true },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'minimal' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-question-interaction',
    name: 'Question / Interaction',
    description:
      'Drives comments and participation: a hook, a question, product/context, a choice or opinion prompt, and an interaction CTA.',
    type: 'reel',
    objectives: ['engagement', 'awareness'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'hook',
          role: 'hook',
          purpose: 'Open with an attention-grabbing beat',
          required: true,
        },
        {
          id: 'question',
          role: 'objection',
          purpose: 'Pose a question the audience will want to answer',
          required: true,
        },
        {
          id: 'context_product',
          role: 'product',
          purpose: 'Ground the question in the product/context',
          required: true,
        },
        {
          id: 'choice',
          role: 'objection',
          purpose: 'Offer a choice or invite an opinion',
          required: false,
        },
        { id: 'cta', role: 'cta', purpose: 'Invite comments, votes, or shares', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'high-contrast' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 4,
      maxSections: 6,
      minDurationSeconds: 15,
      maxDurationSeconds: 30,
    },
    version: 1,
    active: true,
    source: 'system',
  },
  {
    id: 'reel-brand-story',
    name: 'Brand Story / Why Us',
    description:
      'Communicates why the business exists and what makes it meaningful: origin/belief, the need it addresses, what the business does, its differentiator, a brand moment, and a CTA.',
    type: 'reel',
    objectives: ['awareness', 'engagement'],
    compatibleVerticals: BROAD_VERTICALS,
    structure: {
      type: 'reel',
      grammar: [
        {
          id: 'origin_belief',
          role: 'context',
          purpose: 'Establish the origin or belief behind the business',
          required: true,
        },
        {
          id: 'need',
          role: 'problem',
          purpose: 'State the need the business addresses',
          required: true,
        },
        {
          id: 'what_we_do',
          role: 'product',
          purpose: 'Show what the business actually does',
          required: true,
        },
        {
          id: 'differentiator',
          role: 'differentiator',
          purpose: 'State what makes it meaningfully different',
          required: true,
        },
        {
          id: 'brand_moment',
          role: 'closing',
          purpose: 'Land on a genuine brand moment',
          required: true,
        },
        { id: 'cta', role: 'cta', purpose: 'Tell the viewer what to do next', required: true },
      ],
    },
    visualGrammar: { emphasis: 'text-led', composition: 'split-composition' },
    adaptationRules: [],
    constraints: {
      type: 'reel',
      minSections: 5,
      maxSections: 7,
      minDurationSeconds: 20,
      maxDurationSeconds: 45,
    },
    version: 1,
    active: true,
    source: 'system',
  },
];
