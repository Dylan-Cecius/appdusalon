import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const config = read('supabase/config.toml');

describe('edge-function security configuration', () => {
  it('requires JWT for authenticated sensitive functions', () => {
    const jwtFunctions = [
      'create-employee',
      'revoke-employee-access',
      'send-report-email',
      'create-checkout',
      'check-subscription',
      'customer-portal',
      'send-sms-campaign',
      'send-sms-automation',
      'send-sms-test',
      'seed-demo-data',
    ];

    for (const name of jwtFunctions) {
      expect(config).toContain(`[functions.${name}]\nverify_jwt = true`);
    }
  });

  it('keeps public booking endpoints explicitly JWT-free', () => {
    for (const name of [
      'demo-login',
      'get-salon-booking-data',
      'get-booking-slots',
      'create-public-booking',
      'create-booking-payment',
      'stripe-booking-webhook',
      'get-booking-payment-status',
    ]) {
      expect(config).toContain(`[functions.${name}]\nverify_jwt = false`);
    }
  });

  it('keeps retired V1 public booking endpoints inert', () => {
    const retired = {
      'get-services': 'get-salon-booking-data',
      'get-barbers': 'get-salon-booking-data',
      'get-available-slots': 'get-booking-slots',
      'create-booking': 'create-public-booking',
    };

    for (const [name, replacement] of Object.entries(retired)) {
      const source = read(`supabase/functions/${name}/index.ts`);
      expect(source).toContain('deprecated_endpoint');
      expect(source).toContain('status: 410');
      expect(source).toContain(replacement);
    }
  });

  it('requires a cron secret on every JWT-free scheduler endpoint', () => {
    const schedulers = [
      ['process-scheduled-reports', 'CRON_SECRET'],
      ['send-automated-report', 'CRON_SECRET'],
      ['check-appointment-reminders', 'SMS_CRON_SECRET'],
      ['process-sms-automations', 'SMS_CRON_SECRET'],
    ] as const;

    for (const [name, secret] of schedulers) {
      const source = read(`supabase/functions/${name}/index.ts`);
      expect(source).toContain(`Deno.env.get("${secret}")`);
      expect(source).toContain('x-cron-secret');
    }
  });
  it('protects public booking payments with origin checks and Stripe signatures', () => {
    const checkout = read('supabase/functions/create-booking-payment/index.ts');
    const webhook = read('supabase/functions/stripe-booking-webhook/index.ts');

    expect(checkout).toContain('isTrustedAppOrigin');
    expect(checkout).toContain('deposit_required');
    expect(checkout).toContain('appointment_not_payable');

    expect(webhook).toContain('STRIPE_BOOKING_WEBHOOK_SECRET');
    expect(webhook).toContain('constructEventAsync');
    expect(webhook).toContain('stripe-signature');

    const status = read('supabase/functions/get-booking-payment-status/index.ts');
    expect(status).toContain('isTrustedAppOrigin');
    expect(status).toContain('payment_reference');
    expect(status).toContain('confirmed');
  });


});
