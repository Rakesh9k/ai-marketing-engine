import { GENERATE_100_EVAL_CASES, runAiEvalCase, runFullAiEvalSuite } from './evalSuite';

describe('Mitra Automated AI Evaluation Suite (100 Scenarios)', () => {
  it('should generate exactly 100 realistic SMB evaluation scenarios across 6 categories', () => {
    const cases = GENERATE_100_EVAL_CASES();
    expect(cases.length).toBe(100);

    const categories = new Set(cases.map((c) => c.category));
    expect(categories.has('restaurant')).toBe(true);
    expect(categories.has('salon')).toBe(true);
    expect(categories.has('real_estate')).toBe(true);
    expect(categories.has('retail')).toBe(true);
    expect(categories.has('gym')).toBe(true);
  });

  it('CASE 001: should evaluate Hyderabad restaurant funny Telugu biryani ad successfully', () => {
    const cases = GENERATE_100_EVAL_CASES();
    const case001 = cases[0]!;

    expect(case001.id).toBe('CASE_001');
    expect(case001.businessName).toBe('Hyderabadi Spice Kitchen');

    const result = runAiEvalCase(case001);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.checks.length).toBe(7);

    // Verify all 7 required checks
    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).toContain('Correct language');
    expect(checkNames).toContain('Correct product');
    expect(checkNames).toContain('Correct price');
    expect(checkNames).toContain('Correct channel');
    expect(checkNames).toContain('Correct tone');
    expect(checkNames).toContain('No hallucination');
    expect(checkNames).toContain('CTA exists');

    result.checks.forEach((chk) => {
      expect(chk.passed).toBe(true);
    });
  });

  it('CASE 031: should evaluate Royal Beauty Salon Hinglish bridal package ad successfully', () => {
    const cases = GENERATE_100_EVAL_CASES();
    const case031 = cases.find((c) => c.id === 'CASE_031')!;

    expect(case031).toBeDefined();
    expect(case031.category).toBe('salon');

    const result = runAiEvalCase(case031);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('CASE 051: should evaluate Skyline Heights Real Estate 3BHK flat ad successfully', () => {
    const cases = GENERATE_100_EVAL_CASES();
    const case051 = cases.find((c) => c.id === 'CASE_051')!;

    expect(case051).toBeDefined();
    expect(case051.category).toBe('real_estate');

    const result = runAiEvalCase(case051);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should run full 100-scenario evaluation suite and achieve 100% pass rate', () => {
    const summary = runFullAiEvalSuite();

    expect(summary.totalCases).toBe(100);
    expect(summary.passedCases).toBe(100);
    expect(summary.failedCases).toBe(0);
    expect(summary.passRatePercentage).toBe(100);
    expect(summary.averageExecutionTimeMs).toBeLessThan(50); // fast & deterministic

    // Check category breakdown
    expect(summary.categoryBreakdown['restaurant']!.passed).toBe(
      summary.categoryBreakdown['restaurant']!.total
    );
    expect(summary.categoryBreakdown['salon']!.passed).toBe(
      summary.categoryBreakdown['salon']!.total
    );
    expect(summary.categoryBreakdown['real_estate']!.passed).toBe(
      summary.categoryBreakdown['real_estate']!.total
    );
    expect(summary.categoryBreakdown['retail']!.passed).toBe(
      summary.categoryBreakdown['retail']!.total
    );
    expect(summary.categoryBreakdown['gym']!.passed).toBe(summary.categoryBreakdown['gym']!.total);
  });
});
