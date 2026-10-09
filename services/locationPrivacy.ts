export function getVerificationMethod({ locationSharing }: { locationSharing: boolean }): 'geofence' | 'manual' {
  return locationSharing ? 'geofence' : 'manual';
}
