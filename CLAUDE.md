# Project Instructions

## Global rule for every phase

Before each phase, record:

Baseline (verified 2026-10-12 on a clean checkout of commit 91ec88c, Node 24, Windows, with no real GEMINI_API_KEY in the environment; replaces the earlier e6a8d32 figures and the obsolete 38 suites / 687 tests figure):

Full run, emulators on (`npx firebase emulators:exec --project demo-mitra-audit --only auth,firestore,storage "<cmd>"`).
This is the authoritative baseline; skipped tests are never counted as passing.
- functions (`cd functions && npx jest --maxWorkers=50%`): 263 suites passed, 7 skipped (live-provider); 2802 tests passed, 0 failed, 50 skipped
- frontend/root (`npx jest`): 119 suites passed, 0 failed; 1686 tests passed, 0 failed, 7 skipped, 4 todo (legal-review markers) (5 for unimplemented agency/bulk features, 1 browser-only, 1 other)

Plain run, no emulators (emulator-gated tests skip, so this under-reports):
- functions: ~210 suites / ~2350 tests passed, 0 failed, ~286 skipped
- frontend/root: 106 suites / 1491 tests passed, 0 failed, 110 skipped

Also: `tsc --noEmit` clean (root and functions); `next build` passes. `npm run lint` passes (exit 0) on a clean LF checkout; on an old CRLF working copy it reports ~10,959 prettier errors that are line endings only (see `.gitattributes`).
Two Creative Brain suites (`creativeOpportunity.integration`, `creativeBrain.e2eValidation`) take 35-60 s and take 35-80 s; their timeout is 120 s (raised from 30/60 s because the first test pays the cold compile of the Creative Brain graph); keep `--maxWorkers=50%`.
Tests never use a real Gemini key: `functions/src/testSetup.ts` forces a fake one unless `LIVE_GEMINI=1`. Run with the shell's real key unset anyway (`env -u GEMINI_API_KEY ...`).
The Auth emulator is required (createBusiness / onboarding suites call `admin.auth().createUser`).

After each phase:

Run relevant tests
Run full functions test suite
Run typecheck
Compare against baseline
Report all changed files
Report all security findings
Report whether the phase is COMPLETE / BLOCKED / PARTIAL

If a phase discovers a serious architectural issue that belongs to a later phase, document it and stop rather than expanding scope.

@AGENTS.md
