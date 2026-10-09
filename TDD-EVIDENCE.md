# TDD Evidence: Ryan Mackenzie

## User Story
As a user, I want to turn off location sharing at any time and delete my stored location history, so that I stay in control of my sensitive data.

## Acceptance Criteria
- **AC1:** Given location sharing is currently enabled, when the user toggles it off in settings, then the app immediately stops collecting new location data.
- **AC2:** Given the user selects "delete my location history", when confirmed, then all previously stored location data for that user is permanently removed.
- **AC3:** Given location sharing is turned off, when a location-linked task's scheduled time arrives, then the app falls back to manual confirmation instead of attempting geofence detection.

## Acceptance Criteria → Tests
| AC | Covered by |
|----|------------|
| AC1 | T03, T04, T05, (T09) |
| AC2 | T06, T07, T08 |
| AC3 | T01, T02 |

## Agreed design, version 1
Written down before T03 so the tests and the eventual real tracker share the same contract.

- **Point shape:** `{ latitude: number, longitude: number, timestamp: number }`
- **Store:** an in-memory fake used only in tests (`__tests__/helpers/memoryStore.ts`); points are keyed by user ID.
- **Verification method:** reuses the same two string values as the existing (unmerged) `feature/geofence-task-completion` branch — `'geofence' | 'manual'` — so naming stays consistent if that branch is ever merged.
- **Real location tracking does not exist yet anywhere in the codebase.** The tests below use fake points and a mocked/injected stop function rather than a real device location watcher. That gap is intentional and is not claimed as covered by this TDD evidence.

## T01: uses geofence detection when location sharing is on (AC3)
- **Test code:** T01-a-test.png. Caption: checks that `getVerificationMethod` returns `'geofence'` when location sharing is on.
- **Failing:** T01-b-fail.png. Caption: fails because `services/locationPrivacy.ts` doesn't exist yet (module not found).
- **Code to pass:** T01-c-code.png. Caption: minimum code — a hard-coded `return 'geofence'`, no conditional logic yet.
- **Passing:** T01-d-pass.png
- **Commits:** bf6d102 → 77efc7d

## T02: falls back to manual confirmation when location sharing is off (AC3)
- **Test code:** T02-a-test.png. Caption: checks that `getVerificationMethod` returns `'manual'` when location sharing is off.
- **Failing:** T02-b-fail.png. Caption: fails because the hard-coded T01 implementation always returns `'geofence'` regardless of input.
- **Code to pass:** T02-c-code.png. Caption: adds the real `if` (as a ternary) — now checks `locationSharing` instead of always returning `'geofence'`.
- **Passing:** T02-d-pass.png
- **Commits:** <red hash> → <green hash>
