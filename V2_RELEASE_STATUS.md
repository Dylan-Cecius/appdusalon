# V2 — Release status

Branch: `v2/chatgpt-rebuild`

This document separates machine-verified release guarantees from checks that still require an isolated deployed staging environment.

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
