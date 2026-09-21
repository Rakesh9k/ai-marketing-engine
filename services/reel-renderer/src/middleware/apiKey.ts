import { Request, Response, NextFunction } from 'express';
import { API_KEY } from '../config';

/**
 * Defense-in-depth only. The real access control is Cloud Run's own
 * platform-level IAM check on the OIDC identity token, enforced because
 * this service is deployed with --no-allow-unauthenticated — that check
 * happens before our container ever receives the request, so a request
 * reaching this middleware has already been verified as coming from an
 * authorized caller (e.g. the Cloud Functions service account via
 * getIdTokenClient). We additionally check x-api-key here only when
 * REEL_RENDERER_API_KEY is configured, as a second layer.
 */
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) {
    next();
    return;
  }
  const provided = req.header('x-api-key');
  if (provided !== API_KEY) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Missing or invalid x-api-key' } });
    return;
  }
  next();
}
