import { z } from 'zod';
import { generateValidatedJson } from './text';
import {
  aiCallsSoFar,
  inAiCallStage,
  setAiCallStage,
  summarizeAiCalls,
  withAiCallLog,
} from './aiCallLog';

const schema = z.object({ confidence: z.number().int().min(0).max(100), title: z.string().min(1) });

describe('every model call is recorded, with the reason for each repair', () => {
  it('a clean first answer is one record, not a repair', async () => {
    const calls = await withAiCallLog(async () => {
      setAiCallStage('copy_generation');
      await generateValidatedJson(async () => '{"confidence": 80, "title": "x"}', 'p', schema, 2, {
        model: 'm1',
      });
      return [...aiCallsSoFar()];
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ stage: 'copy_generation', model: 'm1', attempt: 0, repair: false, ok: true });
  });

  it('a rejected answer records the validation problem, then the repair that fixed it', async () => {
    const answers = ['{"confidence": 0.9, "title": "x"}', '{"confidence": 90, "title": "x"}'];
    const calls = await withAiCallLog(async () => {
      await generateValidatedJson(async () => answers.shift()!, 'p', schema, 2, { model: 'm1' });
      return [...aiCallsSoFar()];
    });
    expect(calls.map((c) => [c.attempt, c.repair, c.ok])).toEqual([
      [0, false, false],
      [1, true, true],
    ]);
    expect(calls[0]!.problem).toMatch(/confidence/);
  });

  it('malformed JSON and provider errors are recorded as failures with their reason', async () => {
    const steps: Array<() => string> = [
      () => 'not json at all',
      () => {
        throw new Error('503 Service Unavailable');
      },
    ];
    const calls = await withAiCallLog(async () => {
      await generateValidatedJson(async () => steps.shift()!(), 'p', schema, 2, { model: 'm1' }).catch(
        () => undefined
      );
      return [...aiCallsSoFar()];
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ ok: false, problem: expect.stringMatching(/not valid JSON/i) });
    expect(calls[1]).toMatchObject({ ok: false, problem: expect.stringMatching(/503/) });
  });

  it('concurrent stages keep their own attribution and share one log', async () => {
    const calls = await withAiCallLog(async () => {
      await Promise.all(
        ['truth_validation', 'quality_validation', 'safety_validation'].map((stage) =>
          inAiCallStage(stage, () =>
            generateValidatedJson(async () => '{"confidence": 70, "title": "x"}', 'p', schema, 2, {
              model: 'm1',
            })
          )
        )
      );
      return [...aiCallsSoFar()];
    });
    expect(calls.map((c) => c.stage).sort()).toEqual([
      'quality_validation',
      'safety_validation',
      'truth_validation',
    ]);
  });

  it('outside a campaign nothing is recorded and nothing breaks', async () => {
    await generateValidatedJson(async () => '{"confidence": 70, "title": "x"}', 'p', schema);
    expect(aiCallsSoFar()).toEqual([]);
  });

  it('summarises totals, repairs and failures per stage', () => {
    const s = summarizeAiCalls([
      { stage: 'a', model: 'm', attempt: 0, repair: false, ok: false, ms: 100 },
      { stage: 'a', model: 'm', attempt: 1, repair: true, ok: true, ms: 50 },
      { stage: 'b', model: 'm', attempt: 0, repair: false, ok: true, ms: 10 },
    ]);
    expect(s).toMatchObject({ total: 3, repairs: 1, failed: 1, totalMs: 160 });
    expect(s.byStage['a']).toEqual({ calls: 2, repairs: 1, ms: 150 });
  });
});
