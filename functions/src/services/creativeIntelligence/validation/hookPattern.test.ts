import type { ValidationIssue } from './hookPatternValidator';
import { validateHookPattern } from './hookPatternValidator';
import { EXAMPLE_HOOK_PATTERNS } from '../patterns/example-patterns';

describe('HookPatternValidator', () => {
  test('valid pattern passes without errors', () => {
    const pattern = EXAMPLE_HOOK_PATTERNS[0];
    expect(pattern).toBeDefined();
    const issues: ValidationIssue[] = validateHookPattern(pattern!);
    expect(issues.filter((i: ValidationIssue) => i.severity === 'error')).toHaveLength(0);
  });

  test('missing variable placeholder produces error', () => {
    const pattern = EXAMPLE_HOOK_PATTERNS[0]!;
    const badPattern = { ...pattern, formula: '[Audience] + [MissingVar]' };
    const issues = validateHookPattern(badPattern as any);
    const error = issues.find((i: ValidationIssue) => i.path === '/formula' && i.severity === 'error');
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Placeholder \[MissingVar\] has no corresponding variable definition/);
  });

  test('unused variable produces warning', () => {
    const pattern = EXAMPLE_HOOK_PATTERNS[0]!;
    const badPattern = {
      ...pattern,
      variables: [
        ...(pattern.variables ?? []),
        { name: 'Extra', type: 'AUDIENCE', description: 'extra', required: false, source: 'Generated' },
      ],
    } as any;
    const issues = validateHookPattern(badPattern);
    const warning = issues.find((i: ValidationIssue) => i.path === '/variables' && i.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/Variable 'Extra' defined but not used in formula/);
  });

  test('prohibited ethical boundary is flagged', () => {
    const badPattern = { ...EXAMPLE_HOOK_PATTERNS[1], ethicalBoundaries: ['False statistics'] } as any;
    const issues = validateHookPattern(badPattern);
    const error = issues.find((i: ValidationIssue) => i.path.startsWith('/ethicalBoundaries') && i.severity === 'error');
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Prohibited ethical boundary/);
  });
});
