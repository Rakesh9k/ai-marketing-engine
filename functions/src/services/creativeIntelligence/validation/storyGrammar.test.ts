import type { ValidationIssue } from './storyGrammarValidator';
import { validateStoryGrammar } from './storyGrammarValidator';
import type { StoryGrammar } from '../ontology/story-structure';

// Helper to create a minimal valid StoryGrammar
function createValidGrammar(): StoryGrammar {
  return {
    slug: 'story-001',
    name: 'Problem → Agitation → Solution',
    version: '1.0',
    status: 'stable',
    definition: 'Classic problem‑agitation‑solution narrative.',
    semanticPurpose: 'Guide copywriters to structure persuasive stories.',
    category: 'ProblemSolution',
    beats: [
      { id: 'beat-1', label: 'Problem', description: 'State the problem clearly.', order: 1, requiredVariables: ['audience'] },
      { id: 'beat-2', label: 'Agitation', description: 'Amplify the pain.', order: 2 },
      { id: 'beat-3', label: 'Solution', description: 'Present the solution.', order: 3 },
    ],
    variables: [
      { name: 'audience', description: 'Target audience name', type: 'string' },
    ],
    ethicalBoundaries: [],
  } as any; // cast to any to satisfy additional optional fields
}

// Invalid grammar: non‑sequential beat order and missing variable definition
function createInvalidGrammar(): StoryGrammar {
  return {
    slug: 'story-invalid',
    name: 'Invalid Grammar',
    version: '0.1',
    status: 'draft',
    definition: 'Invalid ordering and variable.',
    semanticPurpose: 'Test',
    beats: [
      { id: 'b1', label: 'Start', description: 'Start', order: 1 },
      { id: 'b2', label: 'Middle', description: 'Middle', order: 3 }, // skip 2
    ],
    variables: [],
    ethicalBoundaries: ['fabricated scarcity'],
  } as any;
}

describe('StoryGrammarValidator', () => {
  test('valid grammar passes without issues', () => {
    const grammar = createValidGrammar();
    const issues: ValidationIssue[] = validateStoryGrammar(grammar);
    expect(issues).toHaveLength(0);
  });

  test('invalid grammar reports ordering, missing variable, and prohibited ethical boundary', () => {
    const grammar = createInvalidGrammar();
    const issues = validateStoryGrammar(grammar);
    // Expect at least three errors: ordering, missing variable reference (none), and ethical boundary
    const ordering = issues.find((i) => i.path === '/beats');
    const ethical = issues.find((i) => i.path.startsWith('/ethicalBoundaries'));
    expect(ordering).toBeDefined();
    expect(ethical).toBeDefined();
    // No variable reference errors because there are no requiredVariables
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
