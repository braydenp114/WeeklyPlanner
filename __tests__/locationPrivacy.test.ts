import { getVerificationMethod } from '@/services/locationPrivacy';

describe('location privacy', () => {
  it('1. uses geofence detection when location sharing is on', () => {
    expect(getVerificationMethod({ locationSharing: true })).toBe('geofence');
  });
});
