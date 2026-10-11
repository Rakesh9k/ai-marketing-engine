import * as fs from 'fs';
import * as path from 'path';

/**
 * A Cloud Function only receives a Secret Manager secret that it declares. The Gemini key is read
 * from the environment, so a function that calls the AI without declaring `secrets: ['GEMINI_API_KEY']`
 * deploys fine and then runs with an empty key, failing on every call. generateMarketingPlan did
 * exactly that: it calls the text AI through calendarPlanningService but declared no secret.
 *
 * Every function source that directly imports an AI entry point must declare the secret.
 */
const FUNCTIONS_DIR = __dirname;
const AI_ENTRY_POINTS = [
  /from\s+['"](?:\.\.\/)+services\/ai['"]/,
  /from\s+['"](?:\.\.\/)+services\/ai\/(?:pipeline|vision|text|reelPipeline|factory\/aiProviderFactory)['"]/,
  /from\s+['"](?:\.\.\/)+services\/calendar\/calendarPlanningService['"]/,
];

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.ts$/.test(entry.name) && !/\.(test|live\.test|emulator\.test)\.ts$/.test(entry.name)
      ? [full]
      : [];
  });
}

const aiFunctions = sources(FUNCTIONS_DIR)
  .map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }))
  .filter(({ text }) => /onCall\(/.test(text) && AI_ENTRY_POINTS.some((re) => re.test(text)));

describe('functions that call the AI declare the Gemini secret', () => {
  it('finds the AI-calling functions (guards the guard)', () => {
    const names = aiFunctions.map(({ file }) => path.basename(file, '.ts'));
    expect(names).toEqual(
      expect.arrayContaining([
        'generateCampaignStrategy',
        'regenerateAsset',
        'analyzeReferenceStyle',
        'generateMarketingPlan',
        'discoverOnboardingFacts',
      ])
    );
  });

  it.each(aiFunctions.map(({ file, text }) => [path.basename(file, '.ts'), text] as const))(
    '%s binds GEMINI_API_KEY',
    (_name, text) => {
      expect(text).toMatch(/secrets:\s*\[[^\]]*['"]GEMINI_API_KEY['"]/);
    }
  );
});
