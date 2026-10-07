import { describe, expect, it } from 'vitest';
import {
  normalizeLimit,
  normalizeSubscriptionTier,
  resolveSubscriptionRights,
  SUBSCRIPTION_RIGHTS,
} from './subscriptionRights';

describe('subscription rights policy', () => {
  it('keeps the free plan limited to one staff member', () => {
    expect(SUBSCRIPTION_RIGHTS.none.maxBarbers).toBe(1);
    expect(SUBSCRIPTION_RIGHTS.none.canAccessOnlineBooking).toBe(false);
    expect(SUBSCRIPTION_RIGHTS.none.canManageInventory).toBe(false);
  });

  it('gives Solo online booking and SMS automations without advanced stock/marketing', () => {
    expect(SUBSCRIPTION_RIGHTS.Solo.maxBarbers).toBe(1);
    expect(SUBSCRIPTION_RIGHTS.Solo.canAccessOnlineBooking).toBe(true);
    expect(SUBSCRIPTION_RIGHTS.Solo.canUseSmsAutomations).toBe(true);
    expect(SUBSCRIPTION_RIGHTS.Solo.canManageInventory).toBe(false);
    expect(SUBSCRIPTION_RIGHTS.Solo.canAccessTargetedMarketing).toBe(false);
  });

  it('gives Equipe five active staff and advanced business features', () => {
    expect(SUBSCRIPTION_RIGHTS.Equipe.maxBarbers).toBe(5);
    expect(SUBSCRIPTION_RIGHTS.Equipe.canManageInventory).toBe(true);
    expect(SUBSCRIPTION_RIGHTS.Equipe.canAccessAdvancedStats).toBe(true);
    expect(SUBSCRIPTION_RIGHTS.Equipe.canAccessTargetedMarketing).toBe(true);
  });

  it('normalizes legacy Pro and Enterprise tiers', () => {
    expect(normalizeSubscriptionTier('Pro')).toBe('Equipe');
    expect(normalizeSubscriptionTier('Enterprise')).toBe('Lifetime');
  });

  it('does not grant paid rights to an unsubscribed account', () => {
    const resolved = resolveSubscriptionRights({
      subscribed: false,
      tier: 'Equipe',
    });

    expect(resolved.tier).toBe('none');
    expect(resolved.rights.canManageInventory).toBe(false);
  });

  it('grants Lifetime to the demo account policy', () => {
    const resolved = resolveSubscriptionRights({
      subscribed: false,
      tier: null,
      isDemo: true,
    });

    expect(resolved.tier).toBe('Lifetime');
    expect(resolved.rights.canAccessAPI).toBe(true);
    expect(resolved.rights.maxBarbers).toBe(-1);
  });

  it('converts -1 product limits to Infinity', () => {
    expect(normalizeLimit(-1)).toBe(Number.POSITIVE_INFINITY);
    expect(normalizeLimit(5)).toBe(5);
  });
});
