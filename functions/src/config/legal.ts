/**
 * Server-side source of truth for which Terms/Privacy version a consent
 * acceptance is recorded against. The client sends only a boolean
 * "I agree" — it never supplies which version it thinks it's accepting, so
 * this constant (not client input) is what gets written to
 * users/{uid}.termsVersion / .privacyVersion. This prevents a client from
 * claiming acceptance of a version it never saw.
 *
 * Keep this in sync with the "Version" line shown on the pages themselves:
 * src/app/terms/page.tsx and src/app/privacy/page.tsx (a separate TS
 * project from functions/, so there is no shared import — update both
 * files together when either document changes materially).
 */
export const CURRENT_TERMS_VERSION = '0.1';
export const CURRENT_PRIVACY_VERSION = '0.1';
