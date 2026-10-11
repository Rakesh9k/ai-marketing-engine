# Project Instructions

## Global rule for every phase

Before each phase, record:

Baseline (verified 2026-10-11 on a clean checkout of commit afd6fe8, Node 24, Windows; replaces the obsolete 38 suites / 687 tests figure):

Full run, emulators on (`npx firebase emulators:exec --project demo-mitra-audit --only auth,firestore,storage "<cmd>"`).
This is the authoritative baseline; skipped tests are never counted as passing.
- functions (`cd functions && npx jest --maxWorkers=50%`): 255 suites passed, 7 skipped (live-provider); 2667 tests passed, 0 failed, 50 skipped
- frontend/root (`npx jest`): 113 suites passed, 0 failed; 1627 tests passed, 0 failed, 7 skipped (5 for unimplemented agency/bulk features, 1 browser-only, 1 other)

Plain run, no emulators (emulator-gated tests skip, so this under-reports):
- functions: ~210 suites / ~2350 tests passed, 0 failed, ~286 skipped
- frontend/root: 106 suites / 1491 tests passed, 0 failed, 110 skipped

Also: `tsc --noEmit` clean (root and functions); `next build` passes. `npm run lint` passes (exit 0) on a clean LF checkout; on an old CRLF working copy it reports ~10,959 prettier errors that are line endings only (see `.gitattributes`).
Two Creative Brain suites (`creativeOpportunity.integration`, `creativeBrain.e2eValidation`) take 35-60 s and have a hard 60 s timeout; at full parallelism they can time out (they pass alone) - hence `--maxWorkers=50%`.
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
