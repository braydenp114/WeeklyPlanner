<h1 align="center">Weekly Planner</h1>
<h3 align="center">Plan Your Life with Us!</h3>

A **React Native** mobile application built using **Expo (SDK 57)**. It goes beyond simple scheduling by offering advanced features like goal tracking, background geofencing, native device calendar synchronization, push notification reminders, and comprehensive analytics. It tracks what you planned vs. what actually happened, giving you insights into your weekly productivity.

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
- **Database & Auth:** ![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=flat-square&logo=Firebase&logoColor=FFCA28) (Firestore & Google Sign-In)
- **Offline Storage:** AsyncStorage

---

##  Key Features

- **Advanced Task Management:** Create tasks with flexible durations, categories, color coding, and recurring schedules (daily, weekly, custom days).
- **Background Geofencing:** Attach location presets or specific addresses to tasks. The app uses background location services to automatically mark tasks as completed when you physically arrive at the location during the scheduled time window.
- **Native Calendar Sync:** A fully offline-capable, two-way sync that mirrors your tasks into a dedicated "WeeklyPlanner" calendar directly on your device's native calendar app.
- **Push Notification Reminders:** Get local push notifications before a task starts, with customizable reminder intervals.
- **Weekly Goal Tracking:** Set specific goals for each category and track your completion progress with dynamic progress bars.
- **Dark/Light Mode:** Full theming support respecting your device's system preferences or manual toggles.

---

##  Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org) (LTS version recommended)
- An active Firebase Project configured for Android, iOS, and Web.
- Expo EAS CLI (`npm install -g eas-cli`) if you intend to build standalone Android APKs.

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/braydenp114/WeeklyPlanner.git
   cd WeeklyPlanner/WeeklyPlanner
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the Development Server:**
   ```bash
   npx expo start
   ```

5. **Building the APK (No Android Studio required!):**
   ```bash
   npx eas-cli login
   npx eas-cli build -p android --profile preview
   ```

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

##  Privacy & Data Policy

Location data is sensitive. The application requests background location permission solely for geofence-based task completion. Location coordinates are tied to specific task boundaries and are not continuously tracked or logged for any other purpose. Device calendar interactions happen completely locally on the device via Expo APIs.

---

##  Contribution Workflow

1. **Create a branch:** `git checkout -b feature/your-feature-name`
2. **Develop and check quality:** Ensure `npm run lint` and `npx tsc --noEmit` run without errors.
3. **Commit and push:** Push to your feature branch.
4. **Open a PR:** Open a Pull Request targeting `beta` (or `main`) on GitHub for peer review.
