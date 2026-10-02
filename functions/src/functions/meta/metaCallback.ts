import { onRequest } from 'firebase-functions/v2/https';
import { getEnvConfig } from '../../config/env';
import { createLogger } from '../../utils/logging';
import { metaService } from '../../services/meta/metaService';

const logger = createLogger({ function: 'metaCallback' });

export const metaCallback = onRequest(
  {
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
    secrets: ['META_APP_SECRET', 'META_TOKEN_ENCRYPTION_KEY'],
  },
  async (req, res) => {
    const startTime = Date.now();
    const appUrl = getEnvConfig().APP_URL || process.env['APP_URL'] || 'http://localhost:3000';

    try {
      const code = req.query['code'] as string | undefined;
      const state = req.query['state'] as string | undefined;
      const error = req.query['error'] as string | undefined;
      const errorDescription = req.query['error_description'] as string | undefined;

      if (error || !code || !state) {
        logger.warn('Meta OAuth callback returned error or missing code/state', {
          error,
          errorDescription,
          hasCode: Boolean(code),
          hasState: Boolean(state),
        });

        const redirectUrl = new URL(`${appUrl}/auth/meta/callback`);
        redirectUrl.searchParams.set('error', error || 'cancelled');
        if (errorDescription) {
          redirectUrl.searchParams.set('error_description', errorDescription);
        }
        res.redirect(302, redirectUrl.toString());
        return;
      }

      // Process code & state exchange server-side
      const sessionInfo = await metaService.handleOAuthCallback(code, state);

      logger.info('Meta OAuth callback processed successfully', {
        userId: sessionInfo.userId,
        stateId: sessionInfo.stateId,
        pagesCount: sessionInfo.pagesCount,
        latencyMs: Date.now() - startTime,
      });

      const redirectUrl = new URL(`${appUrl}/auth/meta/callback`);
      redirectUrl.searchParams.set('stateId', sessionInfo.stateId);
      if (sessionInfo.businessId) {
        redirectUrl.searchParams.set('businessId', sessionInfo.businessId);
      }

      res.redirect(302, redirectUrl.toString());
    } catch (err: any) {
      logger.error('Error handling Meta OAuth callback', err, {
        latencyMs: Date.now() - startTime,
      });

      const redirectUrl = new URL(`${appUrl}/auth/meta/callback`);
      redirectUrl.searchParams.set('error', 'connection_failed');
      redirectUrl.searchParams.set(
        'message',
        err instanceof Error ? err.message : 'Meta account connection failed'
      );

      res.redirect(302, redirectUrl.toString());
    }
  }
);
