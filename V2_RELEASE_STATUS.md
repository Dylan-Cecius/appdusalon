# V2 — Release status

Branch: `v2/chatgpt-rebuild`

This document separates machine-verified release guarantees from checks that still require an isolated deployed staging environment.

## Current prepared source — 15 October 2026, shared demonstration

Application source: `1b3c21ba5b0cb42356dd47762524da4691f81478`. Seven checkpoints prepare a shared browser-local demonstration: compatible agenda storage, common catalogue, persistent cart, idempotent simulated receipts, derived dashboard/contacts/statistics, recoverable draft edits and URL/history navigation. Saved only on V2 with `[skip ci]`; **not published**.

- Latest TypeScript check and standalone build passed at this source (4.75 s, VITE_PREVIEW_STANDALONE=true and VITE_PREVIEW_DEMO_ONLY=true). Lint: 0 errors, 206 warnings. Full-cycle whitespace/diff review passed; clean checkout observed before closing documentation.
- Latest unit execution: 363 passed in 37 files, at the preceding draft/contact checkpoint (before the navigation-only adjustment). Latest normal build: 9.21 s, also before that navigation adjustment. These results are not described as new test executions at the final navigation commit.
- 22 new standalone browser cases typechecked and discovered, **not executed**. Total newly prepared browser cases across the five development cycles: **92 unexecuted**. Existing historical browser/preview-safety CI does not validate the current source. No alternate browser/server was launched in the managed runtime.
- Legacy daily key, array/envelope formats, booked prices/steps/recurrences, waitlist and absences are preserved. Malformed/unknown storage remains untouched and the demo uses memory with an explicit warning. Valid drafts remain visible after quota failures; receipts are not confirmed on a failed write. Same-cart replay returns one receipt, including after reload. This is local demo idempotency, not a hosted financial guarantee.
- Cross-tab changes are detected by comparing the expected serialized value, not an atomic multi-tab transaction. The session keeps the legacy local-calendar daily key; a reload on another day starts that day's demonstration. Memory-only or unsaved drafts are lost when the page is reloaded, as announced. Old corrupt storage is not automatically repaired by reset.
- Statistics use Brussels calendar dates: completed/paid appointments at their reserved date and direct tickets at confirmation. Cancelled/no-show/refunded/unconfirmed appointments are excluded; deposits are not added twice. Appointment payment method is explicitly unknown. Contacts are demo-only name/phone groups, not production identities.
- Shared agenda controls and pastel styling remain; other preview pages (stock, report cards, parts of settings/catalogue management) retain presentation-only controls and must not be presented as complete workflows. No hosted backend, SQL, Edge Function, package, workflow, secret or real customer/payment/message was changed or exercised.
- The same owner-private preview remains deployment `appgdep_6acf7158d7288191a2ace0a51208bac2`, source `740f8758eab36e5a30cf03a14f9f76dfe5605dd3`. Current cache/Sites cost prerequisites and required browser verification remain unresolved; no deployment attempted.
- Next: authorized browser verification of the shared flows and existing connected-work fixtures; otherwise a bounded free follow-up for explicit presentation-only controls and locally persisted demo settings. Server reports still require Deno/isolation prerequisites, not real sends.

## Loyalty/report configuration checkpoint — 15 October 2026

Application source: `8d54f1b2e0d3425972de378f4a259f3432171bcc`. Six additional checkpoints prepare coherent loyalty reads, revision-checked settings, browser regression fixtures, shared report configuration reads and confirmed report forms. Saved only on V2 with `[skip ci]`.

- Final TypeScript check passed; 317 unit tests passed in 34 files; final normal build passed (8.61 s). Standalone build passed (4.05 s) with VITE_PREVIEW_STANDALONE=true and VITE_PREVIEW_DEMO_ONLY=true before the final connected-only adjustments; those files are outside its entry.
- Lint: 0 errors, 207 warnings, including Fast Refresh warnings in fixtures. Full-cycle diff reviewed and whitespace checks passed. No package, workflow, SQL, Edge Function or preview source changes in this cycle.
- 70 newly prepared browser cases across four cycles remain **unexecuted**, including 14 loyalty and 8 report-form cases added here. Discovery and fixture/spec typechecks are not browser validation. Connected providers, RLS, client editing/export, loyalty permissions, report delivery and real mobile drawer remain unverified.
- No hosted mutation, real loyalty adjustment, financial operation, email/SMS, real report configuration/export, remote CI or publication occurred. Tests use synthetic data and mocks only. Existing SQL/provider/CI gates below remain required at the exact eventual release commit.
- Known limits: appointments use current client phones; legacy unlinked tickets remain independent; cross-table reads are not SQL snapshots. Loyalty revisions rely on writers advancing updated_at. Automated report configurations remain user-owned; server delivery/error handling, paging, periods and missing stats content still require a separate Deno-validated change.
- The same owner-private preview remains deployment `appgdep_6acf7158d7288191a2ace0a51208bac2`, source `740f8758eab36e5a30cf03a14f9f76dfe5605dd3`; this prepared source is not published there. Current cache/Sites cost prerequisites remain unresolved.
- Next free development: shared synthetic preview state with backward-compatible agenda storage; criteria in docs/V2_REVIEW_2026-10-15.md. Deno was not available in the runtime, so no Edge Function was changed.

The dated follow-ups below are historical checkpoint evidence; later checkpoints supersede their outstanding-task lists.

## Payment-statistics follow-up — 15 October 2026

- Funding allocation integrated into period statistics, selected-day statistics and transaction history. Cash/card/prepayment/unallocated amounts reconcile to recorded sales without counting a deposit twice. This is not a cash-flow report by payment date.
- Local checks: TypeScript passed, 157 unit tests passed, normal build passed (9.67 s), lint 0 errors/222 warnings.
- Four more browser cases prepared and typechecked, not executed (30 new pending cases including the earlier agenda/client work).
- Remaining detailed/export/email report filters are tracked in AUTONOMY-BACKLOG.md. Hosted RLS/relationship reads are unverified; no backend or preview deployment performed.

## Transaction-loading follow-up — 15 October 2026

- Shared salon-scoped provider replaces independent hook reads/subscriptions. Paged reads reject incomplete results and stale requests; errors/retry are visible and report views are withheld until a usable snapshot exists.
- Local checks: TypeScript passed, 166 unit tests passed, normal build passed (8.31 s), lint 0 errors/218 warnings. Nine new pagination/concurrency tests use a fake reader.
- Hosted paging/RLS and browser error/retry flows remain unverified. Cross-page count checks do not provide a database transaction snapshot.

## Detailed-report follow-up — 15 October 2026

- Detailed, total-revenue and custom-period views now select actual funding portions, including mixed sales; prepayment and unknown-allocation categories remain visible. Original transaction totals are preserved.
- TypeScript passed; 173 unit tests passed; final normal build passed (9.48 s). Six additional browser cases prepared and typechecked, not executed (36 cumulative pending cases).
- Email report generation remains a separate follow-up. No real email/export, hosted transaction or publication performed.

## Local email-report generation follow-up — 15 October 2026

- Email preview/text now shares the funding calculation, guards invalid dates and payload size, and blocks sending from an incomplete snapshot. No email or provider operation was executed.
- Local checks: TypeScript passed, 180 unit tests passed, normal build passed (8.07 s), lint 0 errors/216 warnings. Browser form and hosted transport checks remain outstanding.
- Automated server reports were only audited: paging/error handling and rolling-period semantics need a separate isolated follow-up.

## Earlier candidate — 15 October 2026, first cycle

Application source: `498c8a487a327c661555a15321ea90fca0030934` (15 October 2026).

Six application checkpoints prepare appointment-action reliability, terminal-state handling, confirmed contact writes, mutation-response reconciliation, refresh ordering/salon isolation and client-creation recovery. See `AUTONOMY-LOG.md` for exact commits and observed checks.

- Local TypeScript check: passed. Unit suite: 136 passed in 19 files.
- Normal build: passed. Standalone build for the shared agenda changes: passed with both preview flags enabled; the subsequent connected-client form is not part of that standalone entry.
- Lint: 0 errors, 232 warnings.
- 26 new browser cases (13 scenarios × desktop/mobile) were discovered and their new specs/fixtures typechecked, but **not executed**. Historical browser/preview-safety CI results do not validate this candidate.
- No remote CI, hosted integration test, database migration or deployment was run. All new persistence/response tests use synthetic data and mocked query clients.
- The owner-private Sites preview remains the previously published deployment `appgdep_6acf7158d7288191a2ace0a51208bac2`. Prepared GitHub code is newer than that preview.
- Public-repository standard runner minutes were verified as free on 15 October, but current cache-storage cost conditions remain unverified; commits retain `[skip ci]`. No workflow was changed. Sites cost/verification prerequisites also remain required.

The machine-verified list below describes existing gates and historical evidence, not a claim that the current candidate passed every gate.


## Machine-verified

The following are enforced by CI and/or disposable local Supabase rebuilds:

- TypeScript typecheck
- Deno Edge Function typecheck
- unit tests
- production build
- preview-mode build
- desktop/mobile browser smoke tests
- preview safety smoke tests
- lint
- full database migration replay from an empty database
- database lint
- legacy appointment recovery migration regression
- legacy barber-to-staff migration regression
- password crypto/search-path regression
- inventory entitlement RLS and trigger regression
- transaction mutation restricted to validated RPCs
- transaction cancellation remains admin-only
- client deletion restricted to privacy-safe RGPD erasure RPC
- appointment overlap trigger enabled
- staff linked-account deletion guard enabled
- sensitive admin write policies verified
- all public application tables require RLS
- SECURITY DEFINER functions may not retain PUBLIC EXECUTE
- identity RPCs prevent cross-user probing
- legacy barber/admin identity helpers prevent cross-user probing
- retired V1 public booking endpoints remain HTTP 410
- sensitive Edge Functions require JWT
- JWT-free scheduler endpoints require cron secrets
- Stripe checkout and portal remain owner-only and require a canonical salon
- public booking keeps subscription, schedule, rate-limit and conflict checks
- demo seeding is restricted to the authenticated owner of a demo salon
- retired SQL demo reset remains removed
- report and SMS entitlement checks remain server-side

## Intentionally not deployed

Normal commits on this branch do not deploy:

- GitHub Pages V2 preview
- isolated Supabase staging backend

Those workflows run only through the explicit deployment triggers documented in `V2_DEPLOYMENT_CHECKLIST.md`.

No production merge or deployment is authorized by this document.

## Requires isolated staging

These checks cannot be honestly completed against local CI alone because they depend on remote provider configuration or live service behavior:

1. signup / signin / password reset with deployed Supabase Auth
2. MFA enrollment and verification
3. employee invitation email and account activation
4. public booking through deployed Edge Functions, including simultaneous conflict
5. Stripe Solo checkout
6. Stripe Equipe checkout
7. Stripe customer portal
8. subscription downgrade propagation to employee access
9. Resend manual report delivery
10. scheduled report delivery through cron/Vault
11. Twilio appointment reminder
12. Twilio birthday/reactivation automations
13. targeted SMS campaign and opt-out behavior
14. demo login and remote demo reset
15. deployed origin allow-list behavior
16. remote migration history and Edge Function deployment verification

## Required staging GitHub secrets

Environment `v2-staging`:

- `V2_STAGING_SUPABASE_ACCESS_TOKEN`
- `V2_STAGING_SUPABASE_PROJECT_REF`
- `V2_STAGING_DB_PASSWORD`

GitHub Pages preview:

- `V2_PREVIEW_SUPABASE_URL`
- `V2_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

The staging project must be isolated from the tracked default Supabase project.

## Release decision

Code and local automated validation can be considered release-candidate quality only after the exact release commit has green V2 CI and V2 Database CI.

Production readiness still requires:

- isolated staging deployment
- staging provider secrets
- the live integration smoke tests above
- explicit approval before merging/deploying to production
