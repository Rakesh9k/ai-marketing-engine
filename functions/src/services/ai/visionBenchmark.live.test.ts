/**
 * LIVE model benchmark for the VISION path. OPT-IN: skipped unless `LIVE_GEMINI=1`, `BENCH_VISION=1`,
 * a real `GEMINI_API_KEY` and a directory of test photos (`BENCH_IMG_DIR`, files img1..img5.jpg) are set.
 *
 *   LIVE_GEMINI=1 BENCH_VISION=1 BENCH_IMG_DIR=/path/to/photos BENCH_MODELS=a,b \
 *     BENCH_OUT=/path/vision.json npm --prefix functions run test -- src/services/ai/visionBenchmark.live
 *
 * Runs the REAL GeminiVisionProvider (the same prompts, schema and parsing as production) against real
 * photos with a model chosen per run. The vision model is benchmarked on its own: the best text model is
 * not automatically the best vision model.
 *
 * Ground truth (checked by eye): img1 veg biryani in brass bowls · img2 empty B&W hair salon ·
 * img3 three latte-art coffees · img4 apartment building from below · img5 busy café interior.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiVisionProvider } from './vision';

const IMG_DIR = process.env['BENCH_IMG_DIR'] || '';
const ENABLED =
  process.env['LIVE_GEMINI'] === '1' &&
  process.env['BENCH_VISION'] === '1' &&
  !!process.env['GEMINI_API_KEY'] &&
  !!IMG_DIR;
const describeBench = ENABLED ? describe : describe.skip;

const KEY = process.env['GEMINI_API_KEY'] ?? '';
const MODELS = (process.env['BENCH_MODELS'] || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const OUT = process.env['BENCH_OUT'] || '';

const BIZ = {
  name: 'Bench Business',
  category: 'restaurant',
  location: { city: 'Hyderabad', state: 'Telangana' },
};

/** What is really in each photo, as a recognisable word list. */
const CASES = [
  {
    file: 'img1.jpg',
    truth: /biryani|pulao|pulav|rice|pilaf|fried rice/i,
    meta: { name: 'Veg Biryani', price: 249, category: 'main' },
  },
  {
    file: 'img2.jpg',
    truth: /salon|hair|barber|mirror|chair|styling/i,
    meta: { name: 'Our salon floor', price: 0, category: 'space' },
  },
  {
    file: 'img3.jpg',
    truth: /coffee|latte|cappuccino|flat white|cup|espresso/i,
    meta: { name: 'Cappuccino', price: 180, category: 'beverage' },
  },
  {
    file: 'img4.jpg',
    truth: /building|apartment|residential|balcon|flat|tower/i,
    meta: { name: '3BHK apartment', price: 8500000, category: 'property' },
  },
  {
    file: 'img5.jpg',
    truth: /cafe|café|coffee shop|restaurant|interior|dining|seating/i,
    meta: { name: 'Our cafe', price: 0, category: 'space' },
  },
];

interface Call {
  ms: number;
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  modelVersion?: string;
}

const flatten = (v: unknown): string => JSON.stringify(v ?? '');

describeBench('Vision-model benchmark — LIVE, real GeminiVisionProvider', () => {
  jest.setTimeout(300_000);

  const calls: Call[] = [];
  const results: any[] = [];
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let server: http.Server;
  let base = '';

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const file = path.join(IMG_DIR, path.basename(req.url || ''));
      if (!fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      fs.createReadStream(file).pipe(res);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;

    GoogleGenerativeAI.prototype.getGenerativeModel = function (this: any, ...args: any[]) {
      const model = (original as any).apply(this, args);
      const gen = model.generateContent.bind(model);
      model.generateContent = async (...a: any[]) => {
        const started = Date.now();
        const res = await gen(...a);
        const u: any = res.response.usageMetadata || {};
        calls.push({
          ms: Date.now() - started,
          promptTokens: u.promptTokenCount || 0,
          outputTokens: u.candidatesTokenCount || 0,
          thoughtTokens: u.thoughtsTokenCount || 0,
          modelVersion: (res.response as any).modelVersion,
        });
        return res;
      };
      return model;
    } as any;
  });

  afterAll(async () => {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
    await new Promise((r) => server.close(r));
    expect(JSON.stringify(results)).not.toContain(KEY);
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  });

  const matrix = MODELS.flatMap((model) => CASES.map((c) => ({ model, c })));

  it.each(matrix)('product analysis · $model · $c.file', async ({ model, c }) => {
    if (model === 'default') delete process.env['GEMINI_VISION_MODEL'];
    else process.env['GEMINI_VISION_MODEL'] = model;
    calls.length = 0;
    const started = Date.now();
    let out: any;
    let error: string | undefined;
    try {
      out = await new GeminiVisionProvider().analyzeProductImages(
        [`${base}/${c.file}`],
        c.meta,
        BIZ
      );
    } catch (e: any) {
      error = String(e.message).split(KEY).join('[KEY]').slice(0, 200);
    }
    const text = flatten(out);
    results.push({
      task: 'product',
      model,
      file: c.file,
      success: !error,
      error,
      ms: Date.now() - started,
      call: calls[0],
      recognised: !error && c.truth.test(text),
      dishName: out?.dishName,
      confidence: out?.confidence,
      cues: out?.ambianceCues?.slice(0, 3),
      flags: out?.qualityFlags,
    });
    expect(true).toBe(true);
  });

  // The product name says one thing; the photo shows another. A trustworthy model reports the photo.
  it.each(MODELS.map((model) => ({ model })))(
    'mismatch (says biryani, photo is coffee) · $model',
    async ({ model }) => {
      if (model === 'default') delete process.env['GEMINI_VISION_MODEL'];
      else process.env['GEMINI_VISION_MODEL'] = model;
      calls.length = 0;
      const started = Date.now();
      let out: any;
      let error: string | undefined;
      try {
        out = await new GeminiVisionProvider().analyzeProductImages(
          [`${base}/img3.jpg`],
          { name: 'Paneer Biryani', price: 299, category: 'main' },
          BIZ
        );
      } catch (e: any) {
        error = String(e.message).split(KEY).join('[KEY]').slice(0, 200);
      }
      const text = flatten(out);
      results.push({
        task: 'mismatch',
        model,
        file: 'img3.jpg',
        success: !error,
        error,
        ms: Date.now() - started,
        call: calls[0],
        // Honest = describes the coffee, or flags the disagreement. Not just parroting "biryani".
        reportsPhoto: /coffee|latte|cappuccino|cup/i.test(text),
        parrotsName: /biryani/i.test(String(out?.dishName ?? '')),
        dishName: out?.dishName,
        confidence: out?.confidence,
        flags: out?.qualityFlags,
      });
      expect(true).toBe(true);
    }
  );

  it.each(matrix.filter(({ c }) => ['img4.jpg', 'img5.jpg', 'img3.jpg'].includes(c.file)))(
    'reference-style (strict enums) · $model · $c.file',
    async ({ model, c }) => {
      if (model === 'default') delete process.env['GEMINI_VISION_MODEL'];
      else process.env['GEMINI_VISION_MODEL'] = model;
      calls.length = 0;
      const started = Date.now();
      let out: any;
      let error: string | undefined;
      try {
        out = await new GeminiVisionProvider().analyzeReferenceStyle(`${base}/${c.file}`);
      } catch (e: any) {
        error = String(e.message).split(KEY).join('[KEY]').slice(0, 200);
      }
      results.push({
        task: 'reference-style',
        model,
        file: c.file,
        success: !error,
        error,
        ms: Date.now() - started,
        call: calls[0],
        fields: out ? Object.keys(out).length : 0,
      });
      expect(true).toBe(true);
    }
  );
});
