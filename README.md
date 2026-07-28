# Weekly Planner and Beyond

A weekly planner that goes beyond just scheduling stuff. It combines goal tracking, habit streaks, location awareness, travel time, screen time, step count, calendar sync and deadline warnings into one app. It then checks whether you actually did what you planned, including what you did instead if you didn't stick to it.

It's built for people who like to plan their week down to the hour and for people who plan well but struggle to follow through.

## Team

Built for our **Software Development Practice** project by:

- Brayden
- Ryan
- Jason
- Chamithu
- Selah

## Why We're Building This

Most planner apps just track what you say you did and most habit trackers stop at setting a goal. We wanted something that actually closes the gap between the plan and reality. It flags when a plan isn't realistic, like not enough travel time or too much workload, checks whether it actually happened and builds habits off the same data instead of adding a separate tracker for everything.

## Tech Stack

- **React Native** with **Expo** (SDK 54)
- **Expo Router** for navigation
- **Jest** and **React Native Testing Library** for testing
- **Trello** for our scrum board

## Getting Started

### You'll need

- [Node.js](https://nodejs.org) (LTS version)
- [Expo Go](https://expo.dev/go) installed on your phone if you want to test on a real device

### Setup

\`\`\`bash
git clone <https://github.com/YOUR-USERNAME/WeeklyPlanner.git>
cd WeeklyPlanner
npm install
npx expo start
\`\`\`

Scan the QR code with Expo Go, or press `w` for web, `a` for Android emulator or `i` for iOS simulator (Mac only).

## What's In It

### Planning

- One weekly view for study, workout, work and personal tasks
- Checklist box you can drag tasks out of into the schedule
- Recurring tasks that repeat daily, weekly or on specific days
- Goals per category, with the app showing the gap between the goal and what's actually scheduled
- Warnings when a deadline is coming up and nothing's been scheduled for it
- Travel time checks between back-to-back location-based tasks
- Syncs with an external calendar
- Suggests tasks at the start of a new week based on what you've done before

### Verification

- Geofencing detects when you've arrived at a location-tagged task
- Flip a task card after the time block to log what actually happened, whether that's done, done differently or a quick note
- A simple checkbox is still there for tasks that don't need all that detail
- Screen time and step count are used as extra signals, not the only source of truth

### Review

- Weekly summary comparing planned versus actual, per category
- How you're tracking against your original goals, not just this week's plan
- Screen time trend shown next to completion rate so you can spot the correlation
- Habit streaks with grace-period rules so one bad day doesn't wipe your streak

## Sprint Priorities

| Priority                   | What's in it                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Must-Have (Sprint 1)**   | Weekly planner UI, checklist drag-and-drop, recurring tasks, basic checkbox, flip-card tracking, weekly review |
| **Should-Have (Sprint 2)** | Goal gap tracking, deadline warnings, habit streaks, geofence completion, travel time calculation              |
| **Nice-to-Have (stretch)** | Calendar sync, screen time, step count, weather suggestions, predictive autofill                               |

## Working Together

- Branch per feature: `git checkout -b feature/your-feature-name`
- Open a PR before merging into `main`
- Backlog and sprint tracking on Trello

## Privacy

Location data is sensitive, so users can turn off location sharing whenever they want. Location history only sticks around for a limited time unless they choose to keep it.

Location data is sensitive, so users can turn off location sharing whenever they want. Location history only sticks around for a limited time unless they choose to keep it.
