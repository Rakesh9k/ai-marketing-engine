# APP HOSTING TOPOLOGY AUDIT

**Date:** 2026-09-22. **Audit only.** No code, config, DNS, custom-domain mapping, backend, or
GitHub workflow was changed to produce this document — every command run was read-only
(`firebase apphosting:backends:get/list`, `git log`, `curl`, `nslookup`, file reads).

## 1. Executive finding

`www.brain-wise.com` serves the App Hosting backend **`ai-marketing-engine`**, while every CLI
deploy from this repository (via `firebase deploy --only apphosting`, driven by `firebase.json`'s
hardcoded `apphosting.backendId: "mitra-web"`) targets a **different** backend, **`mitra-web`**.
The evidence shows `mitra-web` was the original, deliberately-created backend (Sep 21, via CLI,
documented in `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md`), and that report's own
"next step" instructs connecting GitHub **to that existing backend**. Instead, a **second, new**
backend (`ai-marketing-engine`) was created the next day (Sep 22, via the Firebase Console, not the
CLI — confirmed by the absence of the `deployment-tool: cli-firebase` label that `mitra-web` has),
and the custom domain now points to that second backend, not the original one. `firebase.json` was
never updated to reflect this, so it still points every CLI deploy at the now-domain-disconnected
original backend. This repository's own committed CI/CD (`.github/workflows/ci-cd.yml`) plays **no
role** in this at all — it deploys Cloud Functions only, never App Hosting — so whatever updates
`ai-marketing-engine` is Firebase's own native GitHub-to-Cloud-Build integration, entirely outside
this repo's workflow files.

## 2. Backend inventory

| Property | `ai-marketing-engine` | `mitra-web` |
|---|---|---|
| Backend ID | `ai-marketing-engine` | `mitra-web` |
| Firebase project | `brainwise-ai-marketing-engine` | `brainwise-ai-marketing-engine` |
| Region | `asia-southeast1` | `asia-southeast1` |
| Hosted URL | `ai-marketing-engine--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` | `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` |
| Create time | 2026-09-22T05:50:15 UTC | 2026-09-21T10:48:05 UTC |
| Last update time (per API) | 2026-09-22T08:06:37 UTC | 2026-09-22T14:46:09 UTC (this session's CLI deploy) |
| Creation labels | none (`deployment-tool` label absent) | `deployment-tool: cli-firebase` |
| Repository link (`codebase.repository`) | `.../connections/apphosting-github-conn-dhsk43e/gitRepositoryLinks/Rakesh9k-ai-marketing-engine` | **identical string** — same GitHub connection resource |
| Root directory | `/` | `/` |
| Runtime | `nodejs24` | `nodejs24` (was `nodejs22` at Phase 19C creation, per that report — appears to have been auto-upgraded or updated since) |
| App ID (`appId`) | `1:691254604957:web:caf76181c86efb6a7b5074` | identical — same Firebase Web App resource |
| Service account | `firebase-app-hosting-compute@...` | identical |
| Managed Cloud Run service | `projects/691254604957/locations/asia-southeast1/services/ai-marketing-engine` | `.../services/mitra-web` |
| Custom domain (see §3) | **`www.brain-wise.com`** (strong indirect evidence) | none observed |
| Secret configuration | Not independently visible via CLI metadata for either backend (no secrets field surfaced by `apphosting:backends:get`) | same limitation |
| Live branch / auto-deploy flag | **Not exposed by any `firebase apphosting:backends:*` CLI command available in this environment** — see Stop Conditions note below | same limitation |
| GitHub App integration existence | The `codebase.repository` field proves a GitHub *connection resource* exists and is shared by both backends — this does **not** by itself prove which backend (if either, or both) has automatic-rollout-on-push actually enabled; that flag lives in App Hosting's rollout/trigger config, which this CLI does not surface | same limitation |
| Intended role | See §9 — evidence points to this being the **currently-live production frontend** by virtue of serving the custom domain, but not necessarily the *intended* one | See §9 — evidence points to this being the **originally-intended** production backend per its own creation documentation |

## 3. Custom-domain mapping

**Direct API confirmation of the domain-to-backend mapping record could not be obtained** — the
`firebase apphosting:backends:get`/`:list` commands available in this environment do not surface a
`customDomains` field, and querying Firebase's domain-management API directly requires an OAuth
access token this environment does not have (a prior, unrelated task in this same session
attempted to extract the Firebase CLI's own stored credential to bootstrap one; that was correctly
denied by the permission system, and this audit did not repeat or route around that denial).

**Strong indirect evidence, cross-checked three independent ways, all agreeing:**

1. **Cache-tag header match**: `https://www.brain-wise.com/` returns `cache-tag:
   691254604957:ai-marketing-engine`. `https://ai-marketing-engine--....hosted.app/` returns the
   **identical** cache-tag. `https://mitra-web--....hosted.app/` was not re-checked for its own
   cache-tag this pass, but its route behavior (below) is independently conclusive.
2. **Route-availability fingerprint**: `www.brain-wise.com/terms` → 404. `ai-marketing-engine`'s own
   hosted.app URL → 404 on the same route. `mitra-web`'s own hosted.app URL → 200 on the same route
   (this repo's own local source, deployed today). `www.brain-wise.com` and `ai-marketing-engine`
   agree; `mitra-web` disagrees. Repeated for `/privacy`, `/refund`, `/support` — same pattern every
   time (see §7 table).
3. **`x-fah-adapter` header**: present and identical (`nextjs-14.0.21`) on both `www.brain-wise.com`
   and the `ai-marketing-engine` hosted.app URL, confirming both are served by the App Hosting
   Next.js adapter (i.e. genuinely App-Hosting-backed, not some other legacy Hosting site) — ruling
   out the hypothesis that `www` is served by one of the two classic Firebase Hosting sites also
   present in this project (`brainwise-ai-marketing-engine.web.app`,
   `brainwise-ai-marketing-engine-c74fa.web.app` — both checked this pass, both return 404 on `/`
   itself, i.e. empty/unused, ruling them out entirely as the domain's target).

**Apex vs. www**: `brain-wise.com` (no `www`) does not resolve to a usable HTTPS endpoint at all in
this environment (`nslookup` returns no A/AAAA record; a prior session's TLS-level check found the
apex's handshake fails outright). `www.brain-wise.com` resolves (`35.219.201.34`) and serves real
content. **They are not mapped the same way** — `www` has an active, working App Hosting mapping;
the apex does not have a working one at all (whether it has no mapping, a broken mapping, or a
misconfigured one cannot be distinguished from here without Console/API access).

**Whether Firebase reports a stale/prior mapping, or whether the domain was previously attached to
a different backend before landing on `ai-marketing-engine`, cannot be determined from this
environment** — this specific historical fact would only be visible in the Firebase Console's domain
management UI or via an authenticated Domains API call, neither available here.

## 4. Repository configuration

`firebase.json`'s `apphosting` block (introduced in a single commit, never edited since — see §6):
```json
"apphosting": {
  "backendId": "mitra-web",
  "rootDir": "/",
  "ignore": [...],
  "alwaysDeployFromSource": true
}
```
This is the **sole** selector for which backend any `firebase deploy --only apphosting` (or
`--only functions,apphosting`, as used earlier this session) targets. There is no Firebase "target"
alias (`firebase target:apply`) configured in `.firebaserc` that could redirect this — `.firebaserc`
only declares the project ID, not a backend target. `apphosting.yaml` (the runtime/env config)
applies to whichever backend is deployed to; it is not itself backend-specific and contains no
reference to either backend name. `package.json`/`functions/package.json` have no App-Hosting-aware
deploy script — the CLI invocation used this session was constructed manually, not from a committed
npm script.

**Why the CLI selects `mitra-web`**: purely because that string is hardcoded in `firebase.json`,
written once at backend-creation time (Phase 19C, Sep 21) and never updated. **This was evidently
intentional at the time it was written** (it's the backend that commit's own documentation describes
creating and deploying to) — but has become **stale relative to the domain's actual current target**
now that a second backend exists and the domain points there instead.

## 5. GitHub CI/CD

`.github/workflows/ci-cd.yml` is the **only** workflow file in this repository. Confirmed by direct
grep: it contains **zero references** to `apphosting`, "App Hosting", `mitra-web`,
`ai-marketing-engine`, or `hosted.app`. Its deploy jobs (`deploy-backend-staging`,
`deploy-backend-production`, triggered on push to `develop`/`master` respectively) run exactly
`firebase deploy --only functions --project <secret>` — **Functions only, never App Hosting, never
Hosting**. This matches and reconfirms this session's earlier, separate finding.

**Conclusion: this repository's own GitHub Actions CI/CD does not deploy the frontend to either
backend, at all.** Whatever keeps `ai-marketing-engine` updated on pushes (if anything does — its
`updateTime` of Sep 22 05:50–08:06 UTC could equally represent a one-time manual Console action, not
a recurring auto-deploy) must be Firebase App Hosting's own native GitHub App integration — a
Google-managed Cloud Build trigger configured via the Firebase Console (exactly what Phase 19C's own
"Appendix — Manual steps" instructed doing, for `mitra-web`) that does not appear as a file in this
repository at all and cannot be inspected from here without Console/API access.

**Could both backends receive deployments independently?** Yes — this is not hypothetical, it is
observed fact: this session's own CLI deploy updated `mitra-web` (confirmed by its `updateTime`
changing to 14:46 UTC and its new routes going live), while `ai-marketing-engine` was completely
unaffected (still 404 on the same routes afterward). The two backends are fully independent
deployment targets; nothing about deploying to one touches the other.

**Could a manual `mitra-web` deploy be overwritten by a future GitHub deployment?** Only if
`mitra-web` itself has GitHub auto-deploy enabled — which cannot be confirmed from here (§2). Given
`mitra-web`'s `updateTime` before this session's deploy sat unchanged since its Sep 21 creation
(no evidence of any automatic rollout having ever touched it), the available evidence suggests
`mitra-web` does **not** currently have working GitHub auto-deploy — otherwise a push to `master`
sometime in the ~24 hours between its creation and this session should have updated it, and nothing
in its metadata suggests that happened.

## 6. Deployment history (timeline, from git log + backend metadata + Phase 19C report)

| When (UTC) | Event | Evidence |
|---|---|---|
| 2026-09-21 10:48:05 | `mitra-web` backend created | `apphosting:backends:get mitra-web` → `createTime` |
| 2026-09-21 ~11:03 | Commit `f5fbada` adds `firebase.json`'s `apphosting.backendId: "mitra-web"` and `apphosting.yaml` | `git show f5fbada` |
| 2026-09-21 (same session) | `mitra-web` deployed from local source via CLI; Phase 19C report written; report explicitly instructs, as a pending next step, connecting **this backend** to GitHub via Console | `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` §12, Appendix |
| 2026-09-21 (same report) | Custom domain explicitly confirmed **untouched**: "`brain-wise.com`: UNTOUCHED... `www`: UNTOUCHED. DNS: UNTOUCHED." | same report, §10 |
| 2026-09-22 05:50:15 | `ai-marketing-engine` backend created — **no `cli-firebase` label**, i.e. not created by this repo's CLI workflow | `apphosting:backends:get ai-marketing-engine` |
| 2026-09-22 08:06:37 | `ai-marketing-engine`'s last recorded update before this session | same |
| 2026-09-22 (this session, ~14:46) | `mitra-web` redeployed via CLI (`firebase deploy --only functions,apphosting`) — Functions updated project-wide; `mitra-web` gained the legal/consent/Google-Auth/PayU-era frontend code | this session's deploy log; `mitra-web`'s `updateTime` now 14:46:09 |
| 2026-09-22 (this session, after the above) | `www.brain-wise.com` confirmed still serving the **pre-legal-work** build (404 on `/terms` etc.) | `curl` checks, this and the prior session |

**No commit in this repository's history ever mentions `ai-marketing-engine` as a backend name, ever
edits `firebase.json` to reference it, or documents its creation.** It is entirely absent from the
committed source history — consistent with having been created out-of-band, via the Firebase
Console, not through any change this repository's own history records.

## 7. Version comparison

Directly tested (this session), not inferred from names:

| Route | `www.brain-wise.com` | `ai-marketing-engine` (own URL) | `mitra-web` (own URL) |
|---|---|---|---|
| `/login` | 200 | 200 | 200 |
| `/dashboard` | 200 | 200 | 200 |
| `/terms` | 404 | 404 | **200** |
| `/privacy` | 404 | 404 | **200** |
| `/refund` | 404 | 404 | **200** |
| `/support` | 404 | 404 | **200** |

**`ai-marketing-engine` is confirmed behind `mitra-web`**, not just "different" — it has the
baseline application (auth pages, dashboard) but is missing every route this session's work added
(the six legal pages, and by extension the Google Auth/consent/PayU code shipped alongside them,
though those aren't independently route-testable the same way). `x-fah-adapter: nextjs-14.0.21` is
identical on both, so this isn't a Next.js-version difference — it's the same adapter serving an
older build of the same application.

## 8. Root cause

**Evidence-backed reconstruction, with one inference step clearly flagged as such:**

1. **(Direct evidence)** `mitra-web` was created and deployed deliberately on Sep 21, documented in
   Phase 19C, with the custom domain explicitly confirmed untouched at that time.
2. **(Direct evidence)** That report's own next-step instructions say to connect **the existing
   `mitra-web` backend** to GitHub via the Console.
3. **(Direct evidence)** A second backend, `ai-marketing-engine`, appeared the next day, created via
   the Console (not the CLI — no `cli-firebase` label), and is absent from all repository history.
4. **(Inference, best-supported by all available evidence, not independently proven via Console
   audit logs)**: rather than using App Hosting → `mitra-web` → Settings → "connect repository" (which
   attaches GitHub to the *existing* backend), the operator most likely used App Hosting → "Add
   backend" → connect-to-GitHub, which is Firebase Console's default entry point for first-time
   GitHub-backed App Hosting setup and **creates a new backend** rather than modifying an existing
   one — defaulting its name to the repository name (`ai-marketing-engine`), which matches exactly
   what was created.
5. **(Direct evidence)** The custom domain now points to `ai-marketing-engine`, not `mitra-web` —
   consistent with the custom-domain step being completed as part of that same (later) Console
   session, against whichever backend was open at the time.
6. **(Direct evidence)** `firebase.json` was never updated after step 3/4 to point at the new
   backend — it still says `mitra-web`, because nothing in the repository's history shows anyone
   revisiting that file after its initial Sep 21 commit.

**Root cause, stated plainly**: the intended single-backend architecture (create `mitra-web` → deploy
→ connect *that same backend* to GitHub → point the domain at it) was not followed through on step 2
of its own documented plan. Instead, a second backend was created via a different Console entry
point, and the domain and (likely) the GitHub auto-deploy trigger both ended up attached to that new,
second backend — while the repository's own deploy configuration (`firebase.json`) was never told
about the change, so it keeps deploying to the original, now-domain-disconnected one.

## 9. Intended production backend

**Classification: D — both exist accidentally; the fully-intended end-state architecture cannot be
conclusively determined from available evidence, but the evidence strongly disfavors "both
intentionally required."**

Reasoning:
- Not **A** (`ai-marketing-engine` intended, `mitra-web` obsolete) — nothing in the repository ever
  names or documents `ai-marketing-engine` as an intentional choice; it has no corresponding phase
  report, no commit, no configuration reference anywhere.
- Not cleanly **B** either (`mitra-web` intended, `ai-marketing-engine` obsolete) — while `mitra-web`
  is the *documented*, deliberately-created backend, `ai-marketing-engine` is the one **actually
  serving production traffic on the real domain right now**, which is a very significant fact this
  audit cannot simply override by pointing at older documentation. Calling `ai-marketing-engine`
  "obsolete" would be asserting an intent not evidenced anywhere.
- Not **C** — no environment-split evidence exists (no staging/production naming convention, no
  differing project IDs, no differing configuration profile between the two backends — both target
  the same single Firebase project, the same single Web App ID, the same runtime). Nothing suggests
  two backends were ever meant to coexist permanently.
- **D** fits the evidence best: this looks like a process/setup error (§8) that has not yet been
  reconciled, rather than a designed two-backend architecture. Resolving it requires a decision
  (which backend should be authoritative going forward), not just more investigation — this audit
  surfaces the decision, it does not make it.

## 10. Legal impact

The legal-pages code (this session's `/terms`, `/privacy`, `/refund`, `/cancellation`, `/contact`,
`/support`, plus the consent/deletion/cancellation callables) **does exist in the source** (this
repository's working tree, confirmed built and passing this session) and **does exist in the
deployed `mitra-web` backend** (confirmed live via direct route checks, §7). It is **absent from
`ai-marketing-engine`**, the backend actually serving `www.brain-wise.com`, because nothing has ever
deployed this repository's frontend source to that backend — `ai-marketing-engine` was last updated
Sep 22 08:06 UTC, hours before this session's legal/Google-Auth/PayU work was even written, let alone
deployed anywhere. The six legal routes remain 404 on the live domain **purely as a consequence of
the backend/domain mismatch described above** — not because of any code defect, and not because the
earlier "deploy completed successfully" claim was false (it was true, for `mitra-web`, which simply
isn't the backend the public domain uses).

## 11. PayU impact

No PayU-specific relevance beyond the general frontend-deployment gap. PayU's frontend piece (the
billing page's `createPayUPayment` → `submitPayUCheckout` flow) is part of the same undeployed-to-
`ai-marketing-engine` frontend bundle — so a customer visiting `www.brain-wise.com/billing` today
would not see the PayU checkout flow either (they'd see whatever billing UI `ai-marketing-engine`'s
older build has). This does not change PayU's own status: PayU functions remain fail-closed (no
credentials configured), and this audit made no configuration change to `PAYU_CALLBACK_URL`/
`PAYU_WEBHOOK_URL` or any other PayU setting. The backend mismatch is simply one more reason PayU
isn't reachable in production yet, on top of the already-known credential blocker.

## 12. Google Auth impact

Both backends are built from the same `src/features/auth/` source tree in principle, but since
`ai-marketing-engine` is running an older build (§7), it's plausible (not directly route-testable the
same way, since `/login` returns 200 on both) that `ai-marketing-engine`'s `/login` page **predates**
this session's Google Auth UI work (the "Continue with Google" button) — consistent with its
`updateTime` (Sep 22 08:06 UTC) being before that work existed. This audit did not fetch and diff the
actual page content/bundle of each backend's `/login` route, so this is a plausible inference from
timing, not a directly-observed content difference. **Firebase Console's Google-provider-enabled and
authorized-domain configuration remains independently unverified**, exactly as stated in the prior
session's Google Auth report — this audit did not attempt to re-verify it and found no new evidence
either way.

## 13. Risks

**Deploying to `ai-marketing-engine`** (not done, risk assessment only): would bring the live domain
current with today's work, but (a) requires knowing that backend's correct target syntax
(`firebase deploy --only apphosting:ai-marketing-engine` or a temporary `firebase.json` edit — either
way, not the current default), (b) if `ai-marketing-engine` *does* have a working GitHub auto-deploy
trigger, a manual CLI deploy could race with or be immediately overwritten by the next push-triggered
rollout, producing confusing, non-reproducible state, (c) unknown whether its environment
variables/secrets configuration matches `mitra-web`'s (not independently visible from here).

**Deploying to `mitra-web` again** (as already done this session): safe in isolation, but
**ineffective for the actual goal** (reaching the public domain) as long as the domain points
elsewhere — repeating this without addressing the mismatch just continues updating a backend the
public never sees.

**Changing the custom domain mapping**: explicitly out of scope for this audit and not investigated
as an action (only as a fact-finding target) — doing so without first confirming *why* it currently
points to `ai-marketing-engine` (§8's unresolved inference) risks breaking whatever *does* currently
work for real visitors today, however imperfect.

**Changing GitHub automation**: also out of scope for this audit — since this repo's own
`ci-cd.yml` doesn't touch App Hosting at all, any "GitHub automation" affecting App Hosting lives
entirely in Firebase's Console-managed configuration, invisible to and unmodifiable from this
repository. Any change here would need to happen in the Console, by someone with access to it, with
a clear decision about which backend should own that trigger first.

## 14. Recommended remediation options (NOT executed)

**Option 1 — Make `mitra-web` authoritative again (point the domain back to it).**
- What changes: custom domain mapping (Console-side), no code/config change required in this repo.
- What remains unchanged: `firebase.json` (already correct for this option), `ai-marketing-engine`
  backend itself (could be left running or later decommissioned separately).
- Risks: if `ai-marketing-engine` has an active GitHub auto-deploy trigger that stakeholders are
  relying on, moving the domain away from it silently breaks that expectation for future pushes;
  requires Console access neither this session nor the prior one has confirmed availability for.
- Rollback: point the domain mapping back to `ai-marketing-engine` (Console).
- Effect on GitHub CI/CD: none on this repo's `ci-cd.yml` (unaffected either way); effect on
  Firebase's native GitHub integration unknown without Console access to inspect its current trigger
  target.
- Effect on custom domain: this **is** the custom-domain change.
- Effect on production: `www.brain-wise.com` would immediately start serving whatever `mitra-web`'s
  last deploy contains (today's legal/Google-Auth/PayU-frontend work) — likely the desired outcome,
  but should be confirmed intentional first given the "who set up `ai-marketing-engine`'s GitHub link
  and why" question in §8/§9 is not fully resolved.

**Option 2 — Make `ai-marketing-engine` authoritative instead (update `firebase.json`'s
`backendId`, deploy there going forward).**
- What changes: `firebase.json`'s `apphosting.backendId` → `"ai-marketing-engine"`; all future CLI
  deploys target it; one deploy needed to bring it current with today's work.
- What remains unchanged: the custom domain mapping (already correct for this option); `mitra-web`
  could be left running or decommissioned separately.
- Risks: if `ai-marketing-engine`'s GitHub auto-deploy trigger (if one exists) is configured against
  a branch/commit-based flow this repo doesn't fully control from the CLI, a manual deploy might
  conflict with or be reverted by the next automatic rollout — same category of risk as Option 1's
  reverse case.
- Rollback: revert the `firebase.json` change (trivial, one line).
- Effect on GitHub CI/CD: none on `ci-cd.yml`; Firebase's native integration, if targeting
  `ai-marketing-engine` already, would now be consistent with the CLI's target too (a genuine
  simplification, if confirmed).
- Effect on custom domain: none — already correct.
- Effect on production: would require an actual deploy to take effect (not just the config change),
  which is itself a separate, explicitly-not-executed action per this task's scope.

**Option 3 — Consolidate to one backend, decommission the other, only after confirming which one
Firebase's native GitHub integration actually targets (via Console).**
- What changes: eventually, deletion of one backend (`firebase apphosting:backends:delete`) — a
  destructive, hard-to-reverse action explicitly out of scope for this audit and any near-term
  action without a clear, confirmed decision.
- What remains unchanged: nothing changes until the Console-side question is answered first.
- Risks: deleting the wrong backend, or deleting one still receiving traffic/build triggers, would
  cause a real outage.
- Rollback: none, once deleted (would require recreating the backend and its config from scratch).
- Effect on GitHub CI/CD / custom domain / production: entirely dependent on which backend is kept —
  this option is really "do Option 1 or 2 first, then clean up," not a standalone action.

**Option 4 — Do nothing yet; first obtain Firebase Console access (or equivalent API credentials) to
directly confirm each backend's live-branch/auto-deploy configuration and the exact domain-mapping
record**, closing the one evidence gap this audit could not fill from this environment, before
choosing between Options 1–3.

## 15. Exact next action (recommended, NOT executed)

**Recommended: Option 4 first, then Option 1 or 2.** The single highest-value, lowest-risk next step
is not a deployment or domain change at all — it's confirming, via the Firebase Console (App Hosting
→ each backend → Settings/Deployment tab), (a) whether `ai-marketing-engine` actually has an active
GitHub auto-deploy trigger and, if so, what branch it watches, and (b) the exact custom-domain
mapping record for `www.brain-wise.com`/`brain-wise.com`, including whether the apex has any mapping
attempt at all. Both of those answers directly determine whether Option 1 (restore `mitra-web` as
authoritative) or Option 2 (adopt `ai-marketing-engine` as authoritative) is the lower-risk path —
and neither should be executed based on this audit's evidence alone, since the one open question
(§8's inference step) could change which option is actually correct.

## Stop-condition notes (per this task's own rules — reported, not worked around)

- **Firebase access was sufficient for backend/CLI-level metadata** (both backends fully inventoried
  via `apphosting:backends:get/list --json`) **but insufficient for domain-mapping API records and
  per-backend GitHub live-branch/auto-deploy configuration** — neither is exposed by any
  `firebase apphosting:*` CLI command available in this environment, and the REST APIs that would
  expose them require an OAuth access token this environment does not have. An earlier, unrelated
  task in this session attempted to bootstrap one from the Firebase CLI's own stored credentials;
  that was correctly denied by the permission system, and this audit did not attempt to repeat or
  route around that denial.
- **GitHub repository access was sufficient** — full `git log`/`git show` history available and used.
- **Backend ownership** (which backend is CLI-managed vs. Console-managed) **was established**, via
  the `deployment-tool` label and repository-history absence, with high confidence.
- **Custom-domain mapping** was established with **strong indirect evidence** (three independent,
  mutually-consistent signals: cache-tag match, route-availability fingerprint match, adapter-header
  presence) but **not with a direct API record** — flagged explicitly above rather than presented as
  more certain than it is.
- **Deployment history is not fully unambiguous**: the exact mechanism by which `ai-marketing-engine`
  was created (which specific Console flow was used) is the one inference step in this report (§8
  step 4) that is the best-supported explanation given all available evidence, but is not
  independently proven by an audit log this environment can access.
