/**
 * Tests must never carry a real provider key: a real key in the shell or .env.local once let an unmocked suite make
 * billed Gemini calls on every full run. Skipped only for the explicitly opted-in live harnesses.
 */
const live = process.env['LIVE_GEMINI'] === '1';
(live ? describe.skip : describe)('test environment', () => {
  it('uses the fake Gemini key, never a real one', () => {
    expect(process.env['GEMINI_API_KEY']).toBe('test-fake-gemini-key-for-unit-tests-only');
  });
});
