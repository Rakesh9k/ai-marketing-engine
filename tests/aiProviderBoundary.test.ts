/**
 * Phase 0 (AI provider architecture) — frontend security boundary.
 *
 * No AI provider secret and no direct AI provider API call may ever exist
 * in the Next.js frontend (`src/`). This is a repo-wide grep, run as a real
 * test rather than a one-off manual check, so a future accidental
 * regression (e.g. someone adding `NEXT_PUBLIC_GEMINI_API_KEY`) fails CI
 * instead of shipping.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FRONTEND_ROOT = join(__dirname, '..', 'src');

const FORBIDDEN_PATTERNS: RegExp[] = [
  /GEMINI_API_KEY/,
  /OPENAI_API_KEY/,
  /ELEVENLABS_API_KEY/,
  /PHOTOROOM_API_KEY/,
  /VEO_API_KEY/,
  /NVIDIA_API_KEY/,
  /GoogleGenerativeAI/,
  /generativelanguage\.googleapis\.com/,
  /aiplatform\.googleapis\.com/,
];

function listFilesRecursive(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      files.push(...listFilesRecursive(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('AI provider security boundary (frontend)', () => {
  const files = listFilesRecursive(FRONTEND_ROOT).filter((f) => statSync(f).isFile());

  it('scans a non-trivial number of frontend source files (sanity check on the scan itself)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s contains no AI provider secret or direct provider call', (file) => {
    const content = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(content).not.toMatch(pattern);
    }
  });
});
