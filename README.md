<h1 align="center">Weekly Planner</h1>
<h3 align="center">Plan Your Life with Us!</h3>

A **React Native** mobile application built using **Expo (SDK 57)**. It goes beyond simple scheduling by preparing features for goal tracking, habit streaks, location awareness, travel time, calendar sync, and deadline warnings. It tracks what you planned vs. what actually happened, giving you insights into your weekly productivity.

Built as part of our **Software Development Practice** project.

---

##  Team Members

We are a group of developers collaborating on this project:

| Name | GitHub Profile |
| :--- | :--- |
| **Brayden Pearce** | [braydenp114](https://github.com/braydenp114) |
| **Selah Lee** | [Jumonialmond](https://github.com/Jumonialmond) |
| **Ryan Mackenzie** | [ryamnack](https://github.com/ryamnack) |
| **Jason Wapenaar** | [jasonwapenaar](https://github.com/jasonwapenaar) |
| **Chamithu Mapalagama** | [chamithumapalagama](https://github.com/chamithumapalagama) |

##  Tech Stack

This application is built with the following technologies:

- **Language:** ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
- **Core UI:** ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB)
- **Meta-Framework:** ![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
- **Web Translation:** ![React Native Web](https://img.shields.io/badge/React_Native_Web-20232A?style=flat-square&logo=react&logoColor=61dafb)
- **Routing:** ![Expo Router](https://img.shields.io/badge/Expo_Router-000020?style=flat-square&logo=expo&logoColor=white)
- **Styling:** ![React Native StyleSheet](https://img.shields.io/badge/React_Native_StyleSheet-20232A?style=flat-square&logo=react&logoColor=61DAFB)
- **Backend:** ![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=flat-square&logo=Firebase&logoColor=FFCA28) (Planned integration)

---

##  Project Structure

Here is a breakdown of the key directories in our codebase:

```
├── app/                  # Application screens and routing hierarchy
│   ├── (tabs)/           # Tab-bar routes (index.tsx, explore.tsx)
│   │   ├── _layout.tsx   # Tab routing setup & styling
│   │   ├── explore.tsx   # Explore template screen
│   │   └── index.tsx     # Home screen hosting the WeeklyGrid
│   ├── _layout.tsx       # Root entry, ThemeProvider, Stack Router configuration
│   └── modal.tsx         # Modal template screen
├── components/           # Reusable UI components
│   ├── ui/               # Core UI building blocks (collapsible, icon symbols)
│   ├── WeeklyGrid.tsx    # Scrollable hourly planner grid (7:00 AM - 8:00 PM)
│   ├── haptic-tab.tsx    # Haptic feedback button for bottom tab navigation
│   └── themed-text.tsx   # Typography components respecting color scheme
├── constants/            # Shared theme settings (Colors, Fonts)
└── hooks/                # Custom React Hooks (theme selection, color schemes)
```

---

##  Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org) (LTS version recommended)
- [Expo Go](https://expo.dev/go) app on your mobile device (iOS/Android) or an emulator configured.

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/braydenp114/WeeklyPlanner.git
   cd WeeklyPlanner
   ```

2. **Move into the project folder:**
   ```bash
   cd WeeklyPlanner
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start the Development Server:**
   ```bash
   npx expo start
   ```

5. **Launch the App:**
   - Scan the QR code displayed in the terminal using the **Expo Go** app.
   - Press `a` for the Android emulator.
   - Press `i` for the iOS simulator (macOS only).
   - Press `w` to run on the Web browser.

---

##  Code Verification

We maintain code quality using static checks before committing changes.

### Linting
To check and fix linting errors, run:
```bash
npm run lint
```

### TypeScript Validation
To run the type-checker and verify there are no compile-time type errors, run:
```bash
npx tsc --noEmit
```

---

##  Features Roadmap

### 1. Planning
- [x] Weekly grid view
- [ ] Task checkbox completion
- [ ] Recurring tasks (daily, weekly, custom days)
- [ ] Category-specific goal tracking & gap metrics
- [ ] Impending deadline warnings & alerts
- [ ] Travel time calculations between location-bound tasks

### 2. Verification & Analytics
- [ ] Geofencing completion detection
- [ ] Task logging with post-event outcome flips (completed, done differently, skipped)
- [ ] Screen time and step count integration
- [ ] Weekly summary reports (Planned vs. Actual comparison)
- [ ] Streak trackers with grace-period rules

---

##  Privacy & Data Policy

Location data is sensitive. The application will request permission only when location-aware features are activated, and users can turn off location sharing whenever they want. Location history only persists locally for a limited duration unless the user explicitly chooses to save it.

---

##  Contribution Workflow

1. **Create a branch:** `git checkout -b feature/your-feature-name`
2. **Develop and check quality:** Ensure `npm run lint` and `npx tsc --noEmit` run without errors.
3. **Commit and push:** Push to your feature branch.
4. **Open a PR:** Open a Pull Request targeting `main` on GitHub for peer review.
