import { OntologyRegistry } from '../ontology/ontology-registry';

/**
 * Initial Story Grammar library – core reusable narrative architectures.
 * These examples align with the brief (STORY-001 … STORY-010).
 */
const rawStoryGrammars: any[] = [
  // STORY-001: Problem → Agitation → Solution
  {
    slug: 'story-001',
    name: 'Problem → Agitation → Solution',
    version: '1.0',
    status: 'stable',
    definition: 'Classic three‑act structure that presents a problem, intensifies the pain, and delivers a solution.',
    semanticPurpose: 'Guide creators to frame messaging around a pain point and relief.',
    category: 'ProblemSolution',
    beats: [
      { id: 'beat-1', label: 'Problem', description: 'State the core problem facing the audience.', order: 1 },
      { id: 'beat-2', label: 'Agitation', description: 'Amplify the consequences of the problem.', order: 2 },
      { id: 'beat-3', label: 'Solution', description: 'Introduce the brand offering as the remedy.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-002: Situation → Tension → Reveal
  {
    slug: 'story-002',
    name: 'Situation → Tension → Reveal',
    version: '1.0',
    status: 'stable',
    definition: 'Start with a relatable situation, expose a tension, then reveal a surprising insight.',
    semanticPurpose: 'Create intrigue by juxtaposing everyday context with hidden friction.',
    category: 'SituationTension',
    beats: [
      { id: 'beat-1', label: 'Situation', description: 'Describe the current context or routine.', order: 1 },
      { id: 'beat-2', label: 'Tension', description: 'Highlight the friction or unmet need.', order: 2 },
      { id: 'beat-3', label: 'Reveal', description: 'Present the insight or solution that resolves the tension.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-003: Curiosity → Build → Reveal
  {
    slug: 'story-003',
    name: 'Curiosity → Build → Reveal',
    version: '1.0',
    status: 'stable',
    definition: 'Spark curiosity, develop the premise, and culminate with a reveal.',
    semanticPurpose: 'Leverage intrigue to keep audience engaged through progressive disclosure.',
    category: 'CuriosityBuild',
    beats: [
      { id: 'beat-1', label: 'Curiosity', description: 'Pose a question or teaser.', order: 1 },
      { id: 'beat-2', label: 'Build', description: 'Provide supporting details that deepen interest.', order: 2 },
      { id: 'beat-3', label: 'Reveal', description: 'Deliver the answer or solution.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-004: Before → Process → After
  {
    slug: 'story-004',
    name: 'Before → Process → After',
    version: '1.0',
    status: 'stable',
    definition: 'Show the state before using the product, the transformation process, and the after state.',
    semanticPurpose: 'Highlight tangible change driven by the offering.',
    category: 'BeforeAfter',
    beats: [
      { id: 'beat-1', label: 'Before', description: 'Describe the pain point or status quo.', order: 1 },
      { id: 'beat-2', label: 'Process', description: 'Explain how the product/service works.', order: 2 },
      { id: 'beat-3', label: 'After', description: 'Show the improved outcome.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-005: Claim → Demonstration → Proof
  {
    slug: 'story-005',
    name: 'Claim → Demonstration → Proof',
    version: '1.0',
    status: 'stable',
    definition: 'Make a bold claim, demonstrate it, and back it with proof.',
    semanticPurpose: 'Build credibility through observable evidence.',
    category: 'ClaimProof',
    beats: [
      { id: 'beat-1', label: 'Claim', description: 'State a compelling benefit.', order: 1 },
      { id: 'beat-2', label: 'Demonstration', description: 'Show the claim in action.', order: 2 },
      { id: 'beat-3', label: 'Proof', description: 'Provide data, testimonials, or case studies.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-006: Myth → Truth → Explanation
  {
    slug: 'story-006',
    name: 'Myth → Truth → Explanation',
    version: '1.0',
    status: 'stable',
    definition: 'Debunk a common myth, reveal the truth, and explain the implications.',
    semanticPurpose: 'Educate while clearing misconceptions.',
    category: 'MythTruth',
    beats: [
      { id: 'beat-1', label: 'Myth', description: 'Present the widespread misconception.', order: 1 },
      { id: 'beat-2', label: 'Truth', description: 'State the factual reality.', order: 2 },
      { id: 'beat-3', label: 'Explanation', description: 'Explain why the truth matters for the audience.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-007: Customer → Problem → Experience → Result
  {
    slug: 'story-007',
    name: 'Customer → Problem → Experience → Result',
    version: '1.0',
    status: 'stable',
    definition: 'Narrate a real customer journey from challenge to outcome.',
    semanticPurpose: 'Humanize the brand through relatable case studies.',
    category: 'CaseStudy',
    beats: [
      { id: 'beat-1', label: 'Customer', description: 'Introduce the protagonist.', order: 1 },
      { id: 'beat-2', label: 'Problem', description: 'Describe the obstacle they faced.', order: 2 },
      { id: 'beat-3', label: 'Experience', description: 'Show how they engaged with the solution.', order: 3 },
      { id: 'beat-4', label: 'Result', description: 'Highlight the positive outcome.', order: 4 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-008: Question → Exploration → Answer
  {
    slug: 'story-008',
    name: 'Question → Exploration → Answer',
    version: '1.0',
    status: 'stable',
    definition: 'Poses a question, explores possibilities, and delivers a concise answer.',
    semanticPurpose: 'Structure informational content for clarity.',
    category: 'QnA',
    beats: [
      { id: 'beat-1', label: 'Question', description: 'Ask a compelling question relevant to the audience.', order: 1 },
      { id: 'beat-2', label: 'Exploration', description: 'Discuss options, challenges, or insights.', order: 2 },
      { id: 'beat-3', label: 'Answer', description: 'Provide the definitive answer or recommendation.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-009: POV → Experience → Product → Payoff
  {
    slug: 'story-009',
    name: 'POV → Experience → Product → Payoff',
    version: '1.0',
    status: 'stable',
    definition: 'Tell the story from a point‑of‑view, walk through experience, introduce product, and end with payoff.',
    semanticPurpose: 'Create an immersive narrative that aligns with brand voice.',
    category: 'POVProduct',
    beats: [
      { id: 'beat-1', label: 'POV', description: 'State the narrator’s perspective.', order: 1 },
      { id: 'beat-2', label: 'Experience', description: 'Describe lived experience leading to a need.', order: 2 },
      { id: 'beat-3', label: 'Product', description: 'Introduce the offering that solves the need.', order: 3 },
      { id: 'beat-4', label: 'Payoff', description: 'Show the resulting benefit or transformation.', order: 4 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
  // STORY-010: Discovery → Demonstration → Recommendation
  {
    slug: 'story-010',
    name: 'Discovery → Demonstration → Recommendation',
    version: '1.0',
    status: 'stable',
    definition: 'Begin with a discovery insight, demonstrate its relevance, and recommend action.',
    semanticPurpose: 'Guide audiences from awareness to actionable next steps.',
    category: 'DiscoveryRecommendation',
    beats: [
      { id: 'beat-1', label: 'Discovery', description: 'Reveal an unexpected finding or insight.', order: 1 },
      { id: 'beat-2', label: 'Demonstration', description: 'Show how the discovery applies or solves a problem.', order: 2 },
      { id: 'beat-3', label: 'Recommendation', description: 'Suggest the concrete next step or adoption.', order: 3 },
    ],
    variables: [],
    ethicalBoundaries: [],
  },
];

// Register all story grammars in the ontology registry
export function registerStoryGrammars() {
  rawStoryGrammars.forEach((grammar) => {
    const item = {
      type: 'story_structure',
      id: grammar.id || grammar.slug,
      slug: grammar.slug || grammar.id,
      version: typeof grammar.version === 'number' ? grammar.version : 1,
      status: grammar.status === 'stable' ? 'active' : grammar.status || 'active',
      ...grammar,
    };
    OntologyRegistry.register('story_structure', item as any);
  });
}

// Auto‑register when this module is imported
registerStoryGrammars();
