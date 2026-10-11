import { decideLaunchScope } from './launchScope';

describe('launch scope', () => {
  it.each([
    '/creative',
    '/creative/poster',
    '/assistant',
    '/assistant/history',
    '/analytics',
    '/calendar',
    '/publishing',
    '/settings/social',
    '/auth/meta/callback',
    '/whatsapp',
    '/content',
    '/notifications',
    '/dashboard/activity',
    '/create',
  ])('redirects deferred route %s', (path) => {
    expect(decideLaunchScope(path, true)).toBe('redirect-dashboard');
  });

  it('404s internal routes in production only', () => {
    expect(decideLaunchScope('/admin', true)).toBe('not-found');
    expect(decideLaunchScope('/admin/beta', true)).toBe('not-found');
    expect(decideLaunchScope('/dev/mascot', true)).toBe('not-found');
    expect(decideLaunchScope('/admin', false)).toBe('allow');
  });

  it('404s the canned-content API in every environment', () => {
    expect(decideLaunchScope('/api/generate-content', false)).toBe('not-found');
    expect(decideLaunchScope('/api/generate-content', true)).toBe('not-found');
  });

  it.each([
    '/dashboard',
    '/campaigns/new',
    '/campaigns/abc',
    '/business',
    '/products',
    '/reels/new',
    '/billing',
    '/settings',
    '/usage',
    '/creativeX',
    '/administrator',
  ])('allows launch route %s', (path) => {
    expect(decideLaunchScope(path, true)).toBe('allow');
  });
});
