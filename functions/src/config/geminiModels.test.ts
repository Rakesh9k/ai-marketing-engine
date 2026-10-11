import {
  DEFAULT_DISCOVERY_MODEL,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  discoveryModel,
  textModel,
  visionModel,
} from './geminiModels';

const KEYS = ['GEMINI_TEXT_MODEL', 'GEMINI_VISION_MODEL', 'GEMINI_DISCOVERY_MODEL'] as const;

describe('gemini model defaults', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => KEYS.forEach((k) => ((saved[k] = process.env[k]), delete process.env[k])));
  afterEach(() =>
    KEYS.forEach((k) =>
      saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])
    )
  );

  it('uses the benchmarked models when nothing is configured', () => {
    expect(textModel()).toBe('gemini-3.1-flash-lite');
    expect(visionModel()).toBe('gemini-3.5-flash-lite');
    expect(discoveryModel()).toBe('gemini-flash-lite-latest');
  });

  it('text and vision are pinned ids, not aliases (a pinned id cannot change under us)', () => {
    expect(DEFAULT_TEXT_MODEL).not.toMatch(/latest/);
    expect(DEFAULT_VISION_MODEL).not.toMatch(/latest/);
    expect(DEFAULT_DISCOVERY_MODEL).toBe('gemini-flash-lite-latest');
  });

  it('never defaults to a retired model family', () => {
    for (const m of [DEFAULT_TEXT_MODEL, DEFAULT_VISION_MODEL, DEFAULT_DISCOVERY_MODEL]) {
      expect(m).not.toMatch(/gemini-(1\.5|2\.0|2\.5)/);
    }
  });

  it('each env override is independent and wins over the default', () => {
    process.env['GEMINI_TEXT_MODEL'] = 'text-x';
    expect(textModel()).toBe('text-x');
    expect(visionModel()).toBe(DEFAULT_VISION_MODEL);
    expect(discoveryModel()).toBe(DEFAULT_DISCOVERY_MODEL);
    process.env['GEMINI_VISION_MODEL'] = 'vision-x';
    process.env['GEMINI_DISCOVERY_MODEL'] = 'disc-x';
    expect([textModel(), visionModel(), discoveryModel()]).toEqual([
      'text-x',
      'vision-x',
      'disc-x',
    ]);
  });

  it('an empty override falls back to the default (an unset-but-declared env var must not break calls)', () => {
    process.env['GEMINI_TEXT_MODEL'] = '';
    expect(textModel()).toBe(DEFAULT_TEXT_MODEL);
  });
});
