import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('release-critical server invariants', () => {
  it('keeps Stripe checkout and portal owner-only with a canonical salon', () => {
    for (const path of [
      'supabase/functions/create-checkout/index.ts',
      'supabase/functions/customer-portal/index.ts',
    ]) {
      const source = read(path);
      expect(source).toContain('billing_owner_required');
      expect(source).toContain('salon_not_found');
      expect(source).toContain('resolveBillingOwner');
      expect(source).toContain('isTrustedAppOrigin');
    }
  });

  it('keeps public booking server-side entitlement and collision checks', () => {
    const booking = read('supabase/functions/create-public-booking/index.ts');
    const slots = read('supabase/functions/get-booking-slots/index.ts');

    expect(booking).toContain('online_booking_unavailable');
    expect(booking).toContain('slot_no_longer_available');
    expect(booking).toContain('too_many_booking_attempts');
    expect(booking).toContain('booking_temporarily_limited');
    expect(booking).toContain('recentSalonBookingCount');
    expect(booking).toContain('appointment_conflict');
    expect(booking).toContain('opening_hours');
    expect(booking).toContain('staff_not_working');

    expect(slots).toContain('online_booking_unavailable');
    expect(slots).toContain('opening_hours');
    expect(slots).toContain('appointments');
  });

  it('keeps demo seeding restricted to an authenticated demo salon owner', () => {
    const source = read('supabase/functions/seed-demo-data/index.ts');

    expect(source).toContain('supabase.auth.getUser');
    expect(source).toContain('.eq("owner_user_id", user.id)');
    expect(source).toContain('.eq("is_demo", true)');
    expect(source).toContain('Not a demo salon');
    expect(source).toContain('isTrustedAppOrigin');
  });

  it('keeps the retired SQL demo reset removed from the final schema', () => {
    const migration = read('supabase/migrations/20261008002500_retire_legacy_demo_reset.sql');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.reset_demo_data');
  });

  it('keeps report and SMS entitlements enforced in shared server helpers', () => {
    const reports = read('supabase/functions/_shared/report-access.ts');
    const sms = read('supabase/functions/_shared/sms.ts');

    expect(reports).toContain('has_role_in_salon');
    expect(reports).toContain('["Equipe", "Lifetime"]');

    expect(sms).toContain('admin_required');
    expect(sms).toContain('subscription_required');
    expect(sms).toContain('upgrade_required');
    expect(sms).toContain('["Equipe", "Lifetime"]');
    expect(sms).toContain('["Solo", "Equipe", "Lifetime"]');
  });
  it('requires MFA assurance on authenticated sensitive Edge actions', () => {
    const directlyGuarded = [
      'supabase/functions/create-employee/index.ts',
      'supabase/functions/revoke-employee-access/index.ts',
      'supabase/functions/create-checkout/index.ts',
      'supabase/functions/check-subscription/index.ts',
      'supabase/functions/customer-portal/index.ts',
      'supabase/functions/create-promo-code/index.ts',
      'supabase/functions/seed-demo-data/index.ts',
      'supabase/functions/send-report-email/index.ts',
      'supabase/functions/send-automated-report/index.ts',
    ];

    for (const path of directlyGuarded) {
      expect(read(path)).toContain('requireMfaAssurance');
    }

    const smsShared = read('supabase/functions/_shared/sms.ts');
    expect(smsShared).toContain('requireMfaAssurance');

    for (const path of [
      'supabase/functions/send-sms-campaign/index.ts',
      'supabase/functions/send-sms-automation/index.ts',
      'supabase/functions/send-sms-test/index.ts',
    ]) {
      expect(read(path)).toContain('getAuthenticatedUser');
    }
  });

  it('keeps demo login public but bound to a real demo salon owner', () => {
    const config = read('supabase/config.toml');
    const source = read('supabase/functions/demo-login/index.ts');

    expect(config).toContain('[functions.demo-login]\\nverify_jwt = false');
    expect(source).toContain('DEMO_ACCOUNT_PASSWORD');
    expect(source).toContain('.eq("owner_user_id", data.user.id)');
    expect(source).toContain('.eq("is_demo", true)');
    expect(source).toContain('"Cache-Control": "no-store"');
  });

  it('keeps scheduled SMS entitlement compatible with legacy email-linked subscribers', () => {
    for (const path of [
      'supabase/functions/check-appointment-reminders/index.ts',
      'supabase/functions/process-sms-automations/index.ts',
    ]) {
      const source = read(path);
      expect(source).toContain('user_id.eq.');
      expect(source).toContain('email.eq.');
      expect(source).toContain('.order("updated_at", { ascending: false })');
      expect(source).toContain('.limit(1)');
    }
  });

});
