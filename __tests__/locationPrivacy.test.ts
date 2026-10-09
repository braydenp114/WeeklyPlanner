import { getVerificationMethod } from '@/services/locationPrivacy';

describe('location privacy', () => {
  it('1. uses geofence detection when location sharing is on', () => {
    expect(getVerificationMethod({ locationSharing: true })).toBe('geofence');
  });

  it('2. falls back to manual confirmation when location sharing is off', () => {
    expect(getVerificationMethod({ locationSharing: false })).toBe('manual');
  });
});
