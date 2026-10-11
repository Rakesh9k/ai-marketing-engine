/**
 * behavior: the server-side admin gate denies anonymous and normal users and allows only a
 * verified role=admin claim; application code cannot mint an admin claim.
 */
import type { CallableRequest } from 'firebase-functions/v2/https';

const setCustomUserClaims = jest.fn();
jest.mock('firebase-admin', () => ({
  firestore: () => ({}),
  auth: () => ({ setCustomUserClaims }),
}));

import { requireAdmin, setCustomClaims } from './auth';

const req = (auth: unknown) => ({ auth }) as unknown as CallableRequest;

describe('requireAdmin', () => {
  it('denies an unauthenticated caller', () => {
    expect(() => requireAdmin(req(undefined))).toThrow(/Authentication required/);
  });

  it.each([{}, { role: 'user' }, { role: 'agency_member' }, { admin: true }, { isAdmin: true }])(
    'denies a normal user token %j (a self-asserted admin flag is not a role)',
    (token) => {
      expect(() => requireAdmin(req({ uid: 'u1', token }))).toThrow(/Insufficient permissions/);
    }
  );

  it('allows a verified role=admin claim', () => {
    expect(requireAdmin(req({ uid: 'root', token: { role: 'admin' } }))).toEqual({
      userId: 'root',
    });
  });
});

describe('setCustomClaims', () => {
  beforeEach(() => setCustomUserClaims.mockReset());

  it('refuses to mint an admin claim', async () => {
    await expect(setCustomClaims('u1', { role: 'admin', businessIds: [] })).rejects.toThrow(
      /cannot be assigned/
    );
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('still refreshes ordinary claims', async () => {
    await setCustomClaims('u1', { role: 'user', businessIds: ['b1'] });
    expect(setCustomUserClaims).toHaveBeenCalledWith('u1', { role: 'user', businessIds: ['b1'] });
  });
});
