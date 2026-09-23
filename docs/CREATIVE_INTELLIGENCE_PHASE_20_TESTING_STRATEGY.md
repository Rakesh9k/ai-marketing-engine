# Creative Intelligence Testing Strategy

## Purpose
This document establishes the permanent testing architecture for the Mitra Creative Intelligence system. It ensures that the platform can evolve rapidly without compromising the correctness of the POST pipeline, REEL pipeline, security boundaries, tenant isolation, or idempotency.

## Test Architecture
The test suite utilizes the existing repository infrastructure without introducing new frameworks. It is organized into the following layers:

1. **Unit Tests**: Fast, deterministic tests that mock Firebase and external APIs to verify core domain logic (e.g., Template registry, Adaptation logic, Validation).
2. **Integration Tests**: Tests that run against the Firebase Local Emulator (e.g., `generateCampaignStrategy.consistency.test.ts`) to ensure pipeline state, persistence, and external data flow behave correctly.
3. **Security Tests**: Validate Firestore rules (`firestore.rules`) and HTTP Cloud Function `verifyBusinessAccess` middleware to enforce strict tenant isolation.
4. **Failure-Path Tests**: Dedicated tests (e.g., `generateCampaignStrategy.failSafe.test.ts`) to ensure graceful degradation and non-destructive failure handling under extreme conditions (like Firestore outages or AI API failures).

## Critical Paths Covered

- **Template Registry**: Verifying `listCreativeTemplates` filters correctly by `type`, `objective`, and `vertical` using explicit AND semantics.
- **Context Selection**: Ensuring `CreativeContextSelector` accurately filters and structures `BusinessBrain`, `SavedStyle`, and `Product` inputs into a clean `CreativeTemplateContext` payload, preventing raw sensitive data from leaking into the adaptation stage.
- **Template Adaptation**: Validating the deterministic expansion of high-level template constraints into detailed, generation-ready text and visual prompts.
- **Preference Aggregation & Recommendation**: Asserting that positive/negative feedback mutates confidence appropriately (Phase 16/17) without causing self-reinforcing recommendation loops (Phase 18).
- **Truth Check**: Assuring the factual verification layer continues to intercept hallucinations and malformed claims post-generation.
- **Billing & Usage Control**: Proving that credit reservations operate correctly, ensuring no premature or duplicate charges occur even if generation fails mid-stream.

## Mock Strategy
- **External Providers**: Core AI interfaces (`pipeline.ts`, `truthCheck.ts`) are mocked in unit tests to simulate valid outputs, malformed structures, and timeouts. The test suite does *not* rely on live Gemini/Claude network calls.
- **Firestore Mocks**: For unit testing, standard `.mockResolvedValue()` configurations are used to intercept `getBusinessDoc`, `getCreativePreferencesByBusiness`, and other reads. Integration tests bypass these mocks in favor of the active emulator state.

## Tenant Isolation (Security)
The testing suite explicitly runs authorization tests:
- `Business A` attempting to fetch `Business B`'s preferences via `listCreativeTemplates` is rejected.
- `Business A` attempting to persist feedback for `Business B` is rejected.
- All Firebase emulator tests confirm that requests lacking appropriate `auth.uid` or misaligned `businessId` tokens fail with HTTP 403.

## Regression Safety
Phase 20 guarantees that the old campaign flow (before the introduction of explicit templates and preference memory) remains structurally intact. The addition of `CreativeIntelligence` does not bypass the core billing, idempotency, or rendering systems (e.g., FFmpeg MP4 assembly).

## CI & Commands
This testing architecture is enforced through the existing Continuous Integration (CI) checks. Developers must ensure the following pass locally before merging:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Known Limitations
- End-to-End (E2E) frontend tests currently depend heavily on manual verification for exact UI pixel alignment. Automated deterministic compositor tests verify structured data limits rather than true visual outputs.
- Future A/B testing implementations or automated budget optimizations will require an expanded simulation-testing infrastructure outside the bounds of Phase 20.
