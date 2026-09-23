/**
 * @jest-environment node
 */
import { GET } from './route';

describe('GET /api/health', () => {
  it('returns ok status with no secrets or internal config exposed', async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', service: 'mitra-web' });
    expect(typeof body.timestamp).toBe('string');

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toMatch(/key|secret|token|password|credential/);
  });
});
