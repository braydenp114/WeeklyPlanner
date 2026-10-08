export function getVerificationMethod({ locationSharing }: { locationSharing: boolean }): 'geofence' | 'manual' {
  return 'geofence';
}
