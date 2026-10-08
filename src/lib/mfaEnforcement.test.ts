import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MFA route enforcement', () => {
  it('blocks protected routes until aal2 when MFA is required', () => {
    const app = read('src/App.tsx');

    expect(app).toContain('getAuthenticatorAssuranceLevel');
    expect(app).toContain("data?.nextLevel === 'aal2'");
    expect(app).toContain("data?.currentLevel !== 'aal2'");
    expect(app).toContain('/auth?mfa=required');
  });

  it('resumes the TOTP challenge for an existing aal1 session', () => {
    const auth = read('src/pages/Auth.tsx');

    expect(auth).toContain('getAuthenticatorAssuranceLevel');
    expect(auth).toContain('listFactors');
    expect(auth).toContain("factor.status === 'verified'");
    expect(auth).toContain('setMfaRequired(true)');
  });
});
