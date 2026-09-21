import express, { Request, Response, NextFunction } from 'express';
import { PORT } from './config';
import { apiKeyMiddleware } from './middleware/apiKey';
import { analyzeClip } from './analyze/analyzeClip';
import { renderReel } from './render/renderReel';
import { ApiError } from './types';
import { createLogger } from './lib/logger';

const logger = createLogger('http');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Health check — used by Cloud Run's startup/liveness probes and for a
// quick manual "is this deployment up" curl.
app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(apiKeyMiddleware);

app.post('/analyze-clip', asyncHandler(async (req: Request, res: Response) => {
  const result = await analyzeClip(req.body);
  res.status(200).json(result);
}));

app.post('/render', asyncHandler(async (req: Request, res: Response) => {
  const result = await renderReel(req.body);
  res.status(200).json(result);
}));

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
});

// Centralized error handler: ApiError -> its own status/code, everything
// else -> 500. Never leaks raw ffmpeg stderr in the response body (it's
// logged server-side instead) to keep error responses small and stable for
// the calling Cloud Function to parse.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error('unhandled error', { message });
  res.status(500).json({ error: { code: 'internal_error', message: 'Rendering failed' } });
});

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

app.listen(PORT, () => {
  logger.info(`reel-renderer listening on port ${PORT}`);
});
