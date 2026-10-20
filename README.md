# WeeklyPlanner

WeeklyPlanner is a cross-platform weekly scheduling and productivity application built with React Native and Expo (SDK 57). Designed for high-clarity planning and execution, it pairs multi-view calendar scheduling (Day, Week, and Month) with automated travel-time estimation, geofenced task auto-completion, habit streaks, to-do backlog management, and planned-versus-actual time analytics.

---

## Features

All features listed below are verified and implemented in the codebase:

- **Multi-View Calendar Scheduling**:
  - **Day View**: Hourly vertical schedule with current-time indicator line.
  - **Week View**: Responsive 7-day hourly grid with multi-column overlapping layout for simultaneous tasks.
  - **Month View**: Overview calendar grid with occurrence dots and quick day navigation.
  - **Responsive Layout**: Collapsible sidebar on desktop/tablet (width >= 768px) and drawer menu on mobile devices.
- **Task Creation & Management**:
  - Modal with custom popover date picker (`CalendarPicker`) and time dropdowns (`TimeDropdown`).
  - Category tagging, color swatches, priority indicators (High, Medium, Low), and subtask checklists.
- **Recurrence Engine (Document-per-Occurrence)**:
  - Presets (Daily, Weekly, Weekdays Mon–Fri, Monthly on nth weekday, Yearly) and custom intervals (every N days/weeks/months/years).
  - Materialized as individual Firestore documents linked by a shared `seriesId` for reliable indexing and single-instance edits.
  - Granular **"This event"** vs. **"All events"** update and deletion dialog with batch Firestore operations.
- **Task Preview & Quick Actions**:
  - Desktop popover preview card on hover or click showing task details, location, travel connector, and instant completion toggles.
- **Visual Schedule Differentiation**:
  - Dynamic collision detection and column placement algorithm for concurrent tasks.
  - Past events fade to 55% opacity while preserving category colors.
- **Location Search**:
  - Real-time address autocomplete powered by OpenStreetMap Nominatim with fallback to Photon.
  - Captures latitude and longitude coordinates for distance and routing calculations.
- **Travel Time Estimation**:
  - Calculates travel duration and distance between sequential location-based tasks via a secure Google Routes API Cloud Function proxy.
  - Supports Driving (traffic-aware duration), Transit, Walking, and Two-Wheeler modes.
  - Configurable departure buffer (default 10 minutes) set in Settings.
  - Schedule feasibility warnings in the New Task modal if scheduled gaps are insufficient for transit.
  - Inline travel connector chips displayed between consecutive tasks on the calendar grid.
- **Geofence Auto-Completion**:
  - Uses `expo-location` and `expo-task-manager` to monitor task arrival geofences in the background.
  - Automatically marks tasks as completed when the user enters the target perimeter during the task window.
  - Seamlessly falls back to manual completion on web and emulator platforms. Arrival detection and auto-mark by task type (below) still run on web.
- **Preset Locations & Arrival Detection**:
  - Preset shared locations (campus, gym and others) selectable as chips in the New Task modal.
  - Arrival detection compares the user's location with the presets and logs each arrival. It runs in the foreground on native and on web.
  - Arrival push notification when the user arrives at a preset location.
  - Auto-mark by task type: arriving at a preset completes a task of the same location type when the time is inside its completion window (`completedBy: 'arrival'`).
  - End-of-block push asking "Did you finish ...?" when a task block ends, so the user can confirm or correct the status. Auto-marked tasks are included.
- **Location Privacy**:
  - Settings toggle to turn location sharing off.
  - Button to delete location history.
- **Focus Timer & Task Rollover**:
  - Persistent bottom `FocusBar` tracking active task time and remaining countdown.
  - Overnight banner offering to roll over unfinished tasks from yesterday into today.
- **Productivity Backlog & Habit Streaks**:
  - Sidebar To-Do section for unscheduled backlog items.
  - Habit streak tracker with target frequencies, celebration milestones, and streak shields.
- **Analytics & Reflections**:
  - Weekly planned vs. actual time comparison and category distribution charts.
  - Weekly category target gap tracking (`calculateGoalGap`).
  - Daily reflection prompt card with mood rating icons.

---

## Tech Stack

The application uses the following technology versions specified in `package.json` and `functions/package.json`:

### Frontend (App)
- **Framework**: [Expo SDK 57](https://expo.dev/) (`~57.0.27`)
- **Core UI**: [React Native](https://reactnative.dev/) (`0.86.3`) & [React](https://react.dev/) (`19.2.3`)
- **Navigation & Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (`~57.0.25`)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (`~6.0.3`)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) (`^12.17.1`) with Google Sign-In (`@react-native-google-signin/google-signin` `^16.1.4`)
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore) (`^12.17.1`)
- **Location & Background Services**: `expo-location` (`~57.0.20`), `expo-task-manager` (`~57.0.21`)
- **Notifications**: `expo-notifications` (`~57.0.22`)
- **Styling**: Vanilla React Native `StyleSheet` with shared glassmorphism and theme tokens
- **Icons & Graphics**: `@expo/vector-icons` (`^15.0.3`), `lucide-react-native` (`1.53.0`), `react-native-svg` (`15.15.4`)
- **Gestures & Animations**: `react-native-gesture-handler` (`~2.32.0`), `react-native-reanimated` (`4.5.1`), `react-native-worklets` (`0.10.1`)
- **Web Support**: `react-native-web` (`~0.21.0`), `react-dom` (`19.2.3`)

### Backend (Cloud Functions)
- **Runtime**: Node.js 22
- **Framework**: Cloud Functions for Firebase v2 (`firebase-functions` `^6.3.2`, `firebase-admin` `^13.1.0`)
- **Secrets Management**: Google Cloud Secret Manager (`defineSecret`)
- **External APIs**: Google Maps Routes API (`computeRoutes`)

---

## Project Structure

```
WeeklyPlanner/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow (lint & typecheck)
├── app/                         # Expo Router screens and layouts
│   ├── (tabs)/                  # Main view container
│   │   ├── _layout.tsx          # Responsive layout shell (Sidebar, HamburgerMenu, FAB)
│   │   ├── analytics.tsx        # Weekly review & analytics screen
│   │   └── index.tsx            # Main calendar view screen
│   ├── +html.tsx                # Web HTML document shell
│   ├── _layout.tsx              # Root stack router, theme provider & auth wrapper
│   ├── login.tsx                # Google Sign-In screen
│   └── settings.tsx             # User settings (theme, travel mode, buffer time, location sharing)
├── assets/                      # Application icons and splash screen images
│   └── images/                  # App icon, favicon, and adaptive android icons
├── components/                  # Reusable UI components
│   ├── sidebar/                 # Sidebar sections (Today, To-Do, Streaks)
│   ├── ui/                      # Popover inputs (CalendarPicker, TimeDropdown, LocationAutocomplete)
│   ├── calendar-shared.tsx      # Shared calendar helpers, types, and HoverableTaskCard
│   ├── ConfirmDialog.tsx        # Reusable modal confirmation dialog
│   ├── CustomRecurrenceModal.tsx# Custom interval/day recurrence picker
│   ├── FloatingActionButton.tsx # Mobile task creation FAB
│   ├── FocusBar.tsx             # Active task focus bar with timer
│   ├── HamburgerMenu.tsx        # Mobile drawer navigation menu
│   ├── MonthlyGridView.tsx      # Month calendar grid view
│   ├── NavIcon.tsx              # SVG navigation icon renderer
│   ├── NewTaskModal.tsx         # Primary task creation and editing modal
│   ├── RecurringActionDialog.tsx# "This event" vs "All events" recurrence prompt
│   ├── ReflectionCard.tsx       # Daily reflection and mood logger
│   ├── RolloverBanner.tsx       # Banner offering to roll over incomplete tasks
│   ├── Sidebar.tsx              # Desktop collapsible sidebar
│   ├── SwipeNavigator.tsx       # Horizontal swipe gesture navigation wrapper
│   ├── TaskPreviewPopover.tsx   # Task popover preview card
│   ├── TravelConnectorChip.tsx  # In-grid travel duration badge between tasks
│   └── WeeklyGrid.tsx           # 24-hour Day & Week scheduling grid
├── config/                      # Configuration modules
│   ├── firebase.ts              # Firebase client SDK initialization
│   └── notifications.ts         # Notification handler configuration
├── constants/
│   ├── presetLocations.ts       # Preset shared locations and their types
│   └── theme.ts                 # Shared design tokens, color palettes, and fonts
├── context/                     # React Context providers
│   ├── AuthContext.tsx          # User session & Google Sign-In state
│   ├── FocusContext.tsx         # Active task focus session state
│   ├── NavContext.tsx           # Global view mode, modals, and refresh triggers
│   ├── StreaksContext.tsx       # Habit streaks state and CRUD actions
│   ├── ThemePreferenceContext.tsx# Light / Dark / System theme preference
│   └── TravelSettingsContext.tsx# Travel mode and buffer minutes settings
├── functions/                   # Cloud Functions for Firebase backend
│   ├── src/
│   │   ├── __tests__/           # Cloud Functions unit tests
│   │   └── index.ts             # Routes API proxy function (calculateTravelTime)
│   ├── package.json             # Backend dependencies (Node 22)
│   └── tsconfig.json            # Backend TypeScript configuration
├── hooks/                       # Custom React hooks
│   ├── use-arrival-detection.ts # Arrival check, log, push, and auto-mark
│   ├── use-color-scheme.ts      # Native color scheme detection
│   ├── use-color-scheme.web.ts  # Web color scheme detection
│   └── use-task-reminders.ts    # Background task reminder notification sync
├── scripts/
│   └── generate-google-services.js # Script generating google-services.json from env vars
├── services/                    # Firestore and external API services
│   ├── geofenceService.ts       # Geofencing background tasks and arrival sync
│   ├── reflectionsService.ts    # Daily reflection storage
│   ├── streaksService.ts        # Habit streak calculation and persistence
│   ├── tasksService.ts          # Core task Firestore operations (CRUD, series batches)
│   ├── todosService.ts          # Unscheduled to-do backlog persistence
│   ├── travelTimeService.ts     # Client travel time cache and Cloud Function caller
│   └── weatherService.ts        # Open-Meteo weather service for tasks
├── utils/                       # Pure utility functions and algorithms
│   ├── autoMark.ts              # Auto-mark rule: location type match inside the completion window
│   ├── endOfBlock.ts            # Plans the end-of-block confirm pushes
│   ├── expandRecurrences.ts     # Occurrence date generator for recurring series
│   ├── focus.ts                 # Focus session time formatting helpers
│   ├── geo.ts                   # Distance, preset matching, and arrival detection
│   ├── geofenceWindow.ts        # Time-window bounds for geofence completion
│   ├── priority.ts              # Priority sorting and color helpers
│   ├── reflection.ts            # Reflection date helpers
│   ├── reminders.ts             # Notification scheduling algorithms
│   ├── rollover.ts              # Yesterday-to-today task rollover logic
│   ├── streakChallenge.ts       # Streak milestones and challenges
│   ├── streaks.ts               # Streak count and freeze calculation
│   ├── todayList.ts             # Today section sorting and grouping logic
│   ├── travelFeasibility.ts     # Schedule travel feasibility calculation
│   └── weekly-goal.ts           # Goal gap computation
├── app.json                     # Expo configuration and plugins
├── eas.json                     # Expo Application Services build profiles
├── firebase.json                # Firebase emulator and deployment configuration
├── firestore.indexes.json       # Composite indexes for Firestore queries
└── firestore.rules              # Firestore security rules
```

---

## Data Model

The primary data entity is `Task`, defined in `services/tasksService.ts`:

```typescript
export interface Task {
  id?: string;
  title: string;
  description: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  colorHex: string;
  category: string | null;
  busyStatus: 'busy' | 'free';
  visibility: 'default' | 'public' | 'private';
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekday' | 'custom';
  recurrenceEndDate: Timestamp | null;
  customRecurrenceRule: CustomRecurrenceRule | null;
  notification: { type: string; minutesBefore: number } | null;
  ownerId: string;
  createdAt: Timestamp;
  seriesId?: string;
  completed?: boolean;
  completedAt?: Timestamp | null;
  completedBy?: 'manual' | 'geofence' | 'arrival' | null;
  geofenceRadiusMeters?: number;
  hasChecklist?: boolean;
  checklistItems?: ChecklistItem[];
  isDeadline?: boolean;
  deadlineWarningHours?: number | null;
  linkedDeadlineId?: string | null;
  actualStatus?: 'as_planned' | 'different' | null;
  substitutedActivity?: string | null;
  actualNote?: string | null;
  streakEligible?: boolean;
  priority?: 1 | 2 | 3 | null;
  actualMinutes?: number;
}
```

---

## Setup & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or v22 LTS)
- [npm](https://www.npmjs.com/) (v10+)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (bundled via `npx expo`)
- Android Studio / Xcode (optional, for native emulator builds)

### 1. Installation
Clone the repository and install dependencies for both the app and Cloud Functions:

```bash
git clone https://github.com/braydenp114/WeeklyPlanner.git
cd WeeklyPlanner

# Install app dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### 2. Environment Variables
Create a `.env` file in the project root with the following variables (values should never be committed to source control):

| Variable Name | Purpose |
| :--- | :--- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Web API key for client Firebase SDK |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket name |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Firebase Analytics measurement ID |
| `GOOGLE_SERVICES_ANDROID_API_KEY` | Android client key for `google-services.json` generation |
| `GOOGLE_SERVICES_ANDROID_MOBILESDK_APP_ID` | Mobile SDK App ID for `google-services.json` |
| `GOOGLE_SERVICES_ANDROID_CLIENT_ID` | Android OAuth client ID for Google Sign-In |
| `GOOGLE_SERVICES_PACKAGE_NAME` | Android package name (`weekly.planner`) |
| `GOOGLE_SERVICES_PROJECT_ID` | Project ID for `google-services.json` |
| `GOOGLE_SERVICES_STORAGE_BUCKET` | Storage bucket for `google-services.json` |
| `GOOGLE_SERVICES_PROJECT_NUMBER` | Project number for `google-services.json` |

### 3. Running Locally

- **Web Browser**:
```bash
  npm run web
```
- **Android Emulator / Device**:
```bash
  npm run android
```
- **iOS Simulator**:
```bash
  npm run ios
```

---

## Firebase Setup & Deployment

### 1. Authentication
In the [Firebase Console](https://console.firebase.google.com/):
- Enable the **Google** sign-in provider in Authentication > Sign-in method.
- Add your Web OAuth Client ID and Android SHA-1 fingerprint.

### 2. Firestore Deployment
Deploy security rules and composite indexes:
```bash
firebase deploy --only firestore
```

### 3. Cloud Functions & Secret Manager
The travel time estimation function requires a Google Maps Routes API key stored in Google Cloud Secret Manager:

1. Enable the **Routes API** in your Google Cloud Console.
2. Set the secret in Firebase Secret Manager:
```bash
   firebase functions:secrets:set ROUTES_API_KEY
```
3. Deploy Cloud Functions:
```bash
   firebase deploy --only functions
```

---

## Building for Android (EAS)

Android builds are managed using [Expo Application Services (EAS Build)](https://docs.expo.dev/build/introduction/). Build profiles are configured in `eas.json`:

- `development`: Debug build with development client enabled (output: `.apk`).
- `preview`: Internal testing distribution build (output: `.apk`).
- `production`: Store release build (output: `.aab` Android App Bundle).

### Manual Configuration Steps
1. **Google Sign-In SHA-1**:
   Retrieve your EAS Android keystore SHA-1 fingerprint via:
```bash
   npx eas-cli credentials
```
   Add both your local debug keystore SHA-1 and the EAS build keystore SHA-1 to your Android OAuth Client in the Google Cloud Console / Firebase Console.
2. **`google-services.json` Generation**:
   The `scripts/generate-google-services.js` script automatically generates `google-services.json` from the environment variables prior to every native build (`npm run prestart`). In EAS CI builds, configure the environment variables as EAS Secrets.

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run prestart` | `node ./scripts/generate-google-services.js` | Generates `google-services.json` from `.env` |
| `npm run start` | `expo start` | Starts the Expo local development server |
| `npm run android` | `node ./scripts/generate-google-services.js && expo run:android` | Builds and launches the app on Android |
| `npm run ios` | `expo run:ios` | Builds and launches the app on iOS |
| `npm run web` | `expo start --web` | Starts the web development server |
| `npm run lint` | `expo lint` | Runs ESLint across the codebase |
| `npm test` | `jest` | Executes Jest test suites |

---

## Testing & Quality Assurance

- **Type Checking**:
```bash
  npx tsc --noEmit
```
- **Linting**:
```bash
  npm run lint
```
- **Unit Tests**:
```bash
  npx jest
```
  The suite has 146 tests across 17 suites. The `geo`, `autoMark`, and `endOfBlock` suites were written test-first.
- **CI Pipeline**:
  GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting and type-checking on all pushes and pull requests targeting `main`.

---

## Known Limitations & Follow-ups

- **Native-Only Background Features**: Geofencing (`expo-location` background monitoring) requires a physical Android or iOS device and is gracefully disabled in web browser environments.
- **Device Calendar Sync**: *(TODO: confirm)* Native calendar synchronization (`expo-calendar`) is currently under development on a feature branch and is not yet merged to `main`.
- **Firebase App Check**: Enforcement is currently disabled (`enforceAppCheck: false`) on the Cloud Function until native Play Integrity app attestation is configured.

---

## Contributing & Branching Guidelines

- **Branch Naming**:
  - `feature/<name>` for new features (e.g., `feature/travel-time-estimation`)
  - `fix/<name>` for bug fixes (e.g., `fix/recurring-tasks`)
  - `chore/<name>` for maintenance or dependency cleanup (e.g., `chore/repo-cleanup-and-readme`)
- **Review & Merge Flow**:
  1. Create a feature branch from an up-to-date `main`.
  2. Ensure `npx tsc --noEmit`, `npm run lint`, and `npm test` all pass.
  3. Submit a Pull Request targeting `main`.
  4. Ensure GitHub Actions CI passes before merging.
- **Release Branch**: The final Sprint 2 code is on the `Release` branch, created from `main`.
