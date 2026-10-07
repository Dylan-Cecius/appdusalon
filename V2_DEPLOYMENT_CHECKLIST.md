# V2 — Deployment checklist

This checklist applies to the `v2/chatgpt-rebuild` branch. Do not run it against production until the release is explicitly approved.

## 1. Environment isolation

Use a dedicated Supabase project for staging/preview. Never point a public preview at the production database.

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PREVIEW_DEMO_ONLY=true` on the public V2 preview
- `VITE_DEMO_ACCOUNT_EMAIL` (optional; defaults to `demo@appdusalon.com` and must match the Edge `DEMO_ACCOUNT_EMAIL` when customized)

For the GitHub Pages V2 preview, configure these GitHub secrets:

- `V2_PREVIEW_SUPABASE_URL`
- `V2_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

The preview workflow fails closed when those secrets are absent and refuses to deploy if the preview Supabase URL matches the tracked default `.env`.

### Isolated staging backend workflow

The manual `.github/workflows/v2-staging-backend.yml` workflow requires:

- `V2_STAGING_SUPABASE_ACCESS_TOKEN`
- `V2_STAGING_SUPABASE_PROJECT_REF`
- `V2_STAGING_DB_PASSWORD`
- manual confirmation text `STAGING_ONLY`

It refuses to run when the staging project ref matches the tracked default Supabase project. It performs a migration dry-run, applies pending migrations without seed data, deploys Edge Functions explicitly to the staging project ref, then lists remote migration history.

Required application origin variables:

- `APP_URL` — canonical deployed app origin, e.g. `https://app.example.com`
- `ALLOWED_APP_ORIGINS` — comma-separated additional trusted origins, e.g. staging/preview URLs

## 2. Supabase Edge Function secrets

Configure these server-side only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `REPORT_FROM_EMAIL` — verified Resend sender, e.g. `L'App du Salon <rapports@example.com>`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `CRON_SECRET`
- `SMS_CRON_SECRET`
- `DEMO_ACCOUNT_EMAIL` (optional; defaults to demo@appdusalon.com)
- `DEMO_ACCOUNT_PASSWORD`

Never expose service-role, Stripe, Resend, Twilio, cron or demo passwords as `VITE_*` variables.

## 3. Supabase Vault secrets

The database schedulers read these values from Vault:

- `functions_base_url` — e.g. `https://<project-ref>.supabase.co`
- `cron_secret` — must equal Edge secret `CRON_SECRET`
- `sms_cron_secret` — must equal Edge secret `SMS_CRON_SECRET`

The migration enabling `supabase_vault` must run before scheduler migrations are exercised.

## 4. Database migrations

Apply all migrations in order to the target environment.

Critical V2 migrations include:

- platform admin registry
- server-side statistics password
- secure promo redemption
- public booking hardening
- staff plan limits
- SMS provider hardening
- Todo `staff_id` migration
- atomic POS create/delete
- appointment overlap prevention
- SMS automation indexes
- secure report/SMS schedulers
- Vault enablement
- legacy product migration + product/service separation
- privacy-safe client erasure
- paid client-note enforcement
- salon-scoped settings/password
- subscription-aware member RLS
- identity helper hardening
- legacy demo reset retirement

After migrations, verify there are no failed migrations and no duplicate RLS policies granting broader access than intended.

## 5. Edge Functions

Deploy the functions in `supabase/functions`.

Important public endpoints:

- `get-salon-booking-data`
- `get-booking-slots`
- `create-public-booking`

Important authenticated/admin endpoints:

- `create-employee`
- `create-checkout`
- `check-subscription`
- `customer-portal`
- `send-report-email`
- `send-automated-report`
- `send-sms-campaign`
- `send-sms-automation`
- `send-sms-test`
- `seed-demo-data`

Cron endpoints:

- `process-scheduled-reports`
- `check-appointment-reminders`
- `process-sms-automations`

Legacy booking endpoints returning HTTP 410 should remain retired.

## 6. Stripe

Verify:

- checkout works for Solo (19 EUR/month)
- checkout works for Equipe (59 EUR/month)
- duplicate live subscriptions are refused
- only the salon owner can create checkout sessions
- only the salon owner can open the customer portal
- subscription metadata contains the billing owner user ID and plan
- `check-subscription` resolves employee rights from the salon owner
- downgrade from Equipe disables employee access

Add the final production/staging origins to `APP_URL` / `ALLOWED_APP_ORIGINS`.

## 7. Resend

Verify `REPORT_FROM_EMAIL` is a verified sender/domain.

Test:

- manual report email
- automated report test
- scheduled report
- Equipe/Lifetime allowed
- Solo/Free rejected server-side

## 8. Twilio

Test:

- appointment reminder
- birthday automation
- reactivation automation
- targeted campaign
- opt-out clients are excluded
- deduplication works
- Free is rejected
- Solo: automations allowed, targeted campaigns rejected
- Equipe/Lifetime: automations + targeted campaigns allowed

## 9. Cron

Verify `cron.job` contains:

- `process-scheduled-reports` every 15 minutes
- `process-sms-automations` hourly (function sends only in the 08:00 Europe/Brussels window)
- appointment reminder scheduler as configured for the environment

Verify HTTP invocations return 2xx with the matching Vault/Edge secrets.

## 10. Demo

The demo must use the Edge Functions:

- `demo-login`
- `seed-demo-data`

The retired SQL RPC `reset_demo_data()` must not exist after migrations.

Verify demo reset cannot modify a non-demo salon.

## 11. Security checks

Verify with an employee account:

- cannot access Settings, Team management, SMS management, Reports, Stock management, Subscription management or transaction history
- cannot create/update/delete services/products/opening hours through direct Supabase calls
- cannot cancel a POS transaction through the RPC
- cannot redeem promo codes
- loses access after the salon downgrades below Equipe

Verify with a Free/Solo owner:

- staff-count limits are enforced server-side
- paid notes/report/inventory rights are enforced server-side
- public online booking is disabled on Free

## 12. Functional QA

Run the V2 CI and require all steps to pass:

- TypeScript typecheck
- Deno Edge Function typecheck
- unit tests
- production build
- desktop Playwright smoke tests
- mobile Playwright smoke tests
- lint

Manual smoke test:

1. sign up / sign in / password reset
2. MFA
3. create service
4. create product + stock
5. POS service sale
6. POS product sale and stock decrement
7. POS cancellation and stock restoration
8. client create/edit
9. client RGPD erasure
10. staff member + employee invite
11. agenda create/edit/cancel
12. public booking + simultaneous-slot conflict
13. subscription checkout / portal
14. report send/schedule
15. SMS automations/campaign
16. demo login/reset

## 13. Release

Before production:

- CI must be green on the exact release commit
- staging must use isolated Supabase data
- all secrets must be configured
- migrations and functions must be deployed to staging first
- run manual smoke test on staging
- only then merge/deploy to production after explicit approval
