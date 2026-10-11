import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      service: 'mitra-web',
      timestamp: new Date().toISOString(),
    });
  }),

  // Content generation mock endpoint
  http.post('/api/generate-content', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized: Missing or malformed Authorization header' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    if (!body?.topic) {
      return HttpResponse.json(
        { error: 'Topic or product description is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      text: `✨ Mock MSW Generated Content for ${body.topic} ✨`,
    });
  }),
];
