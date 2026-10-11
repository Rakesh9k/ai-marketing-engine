import {
  applyUserAnswers,
  deriveOnboardingEvents,
  type OnboardingDraft,
  type UserAnswerInput,
} from './draftModel';

const T0 = '2026-10-04T10:00:00.000Z';
const T1 = '2026-10-04T10:05:00.000Z';

const REQUIRED = [
  { path: 'owner.name', value: 'Asha' },
  { path: 'identity.industry', value: 'retail' },
  { path: 'identity.subcategory', value: 'fashion' },
  { path: 'identity.name', value: 'Threads' },
  { path: 'identity.city', value: 'Pune' },
  { path: 'identity.state', value: 'Maharashtra' },
  { path: 'contact.whatsapp', value: '9876543210' },
];

const complete = () => applyUserAnswers(null, 'u1', { updates: REQUIRED }, T0);
const incomplete = () => applyUserAnswers(null, 'u1', { updates: REQUIRED.slice(0, 3) }, T0);

describe('review state', () => {
  it('moves to ready_for_review only when the owner is shown the review AND the draft is reviewable', () => {
    expect(applyUserAnswers(complete(), 'u1', { reviewShown: true }, T1).status).toBe(
      'ready_for_review'
    );
    // A client claiming it showed the review cannot make an incomplete draft reviewable.
    expect(applyUserAnswers(incomplete(), 'u1', { reviewShown: true }, T1).status).toBe(
      'in_progress'
    );
  });

  it('does not move to ready_for_review without being shown', () => {
    expect(complete().status).toBe('in_progress');
  });

  it('goes back to in_progress when the owner changes anything after seeing the review', () => {
    const reviewed = applyUserAnswers(complete(), 'u1', { reviewShown: true }, T1);
    const edited = applyUserAnswers(
      reviewed,
      'u1',
      { updates: [{ path: 'identity.city', value: 'Mumbai' }] },
      T1
    );
    expect(edited.status).toBe('in_progress');
  });

  it('also goes back when they skip something, but a bare re-save keeps the review', () => {
    const reviewed = applyUserAnswers(complete(), 'u1', { reviewShown: true }, T1);
    expect(applyUserAnswers(reviewed, 'u1', { skip: ['owner.role'] }, T1).status).toBe(
      'in_progress'
    );
    expect(applyUserAnswers(reviewed, 'u1', { welcomed: true }, T1).status).toBe(
      'ready_for_review'
    );
  });

  it('bumps the revision on every save, so a confirm can be pinned to exactly what was reviewed', () => {
    const a = complete();
    const b = applyUserAnswers(a, 'u1', { reviewShown: true }, T1);
    expect(b.revision).toBe(a.revision + 1);
  });

  it('refuses any further answers once the business has been created', () => {
    const done: OnboardingDraft = { ...complete(), status: 'completed', businessId: 'b1' };
    expect(() => applyUserAnswers(done, 'u1', { reviewShown: true }, T1)).toThrow(
      /already complete/i
    );
  });
});

describe('review funnel event', () => {
  const run = (before: OnboardingDraft | null, input: UserAnswerInput) => {
    const after = applyUserAnswers(before, 'u1', input, T1);
    return deriveOnboardingEvents(before, after, input).map((e) => e.name);
  };

  it('records onboarding_review_shown exactly once, when the review is first shown', () => {
    const first = run(complete(), { reviewShown: true });
    expect(first).toContain('onboarding_review_shown');

    const reviewed = applyUserAnswers(complete(), 'u1', { reviewShown: true }, T1);
    expect(run(reviewed, { reviewShown: true })).not.toContain('onboarding_review_shown'); // refresh
  });

  it('records nothing when an incomplete draft claims to be reviewed', () => {
    expect(run(incomplete(), { reviewShown: true })).not.toContain('onboarding_review_shown');
  });
});
