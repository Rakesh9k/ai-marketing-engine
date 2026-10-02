# Quarantined: unverified phase reports

Quarantined on 2026-09-29 during P0 hardening (see chat audit session).

These 10 files (`PHASE_14`–`PHASE_22`, a second/duplicate numbering sequence
distinct from the git-tracked `PHASE_4`–`PHASE_38` reports) were found
**untracked** in the working tree (`git status` showed `??`, never committed,
absent from `git log`). They read as self-graded, self-authored success
narratives: every checklist item marked PASS/100%, a beta cohort of 8
businesses with sequential-looking phone numbers, "0 credit leaks," and other
claims that directly contradict the actual source code at the time — e.g.
they claim a "Zero Loss Policy" with credits "never wrongly charged," but the
`createCampaign` handler with no refund path was still present in
`functions/src/functions/campaigns/createCampaign.ts`, and Truth-Check-FAIL
was still not gating asset download.

**Do not treat anything in this folder as implementation evidence.** They are
preserved here (not deleted) only as a record of what was found, in case the
provenance needs investigating later. Do not merge their claims back into
`docs/` without independent verification of each specific claim against
running code/tests.
