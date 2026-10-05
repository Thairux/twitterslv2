---
name: release-manager
description: Handles bumping the version, building the Android APK, and moving it to releases/ with docs.
---

# Release Manager Skill

This skill is responsible for the release process of the TwitterSL v2 application.

## Process
1. **Bump Version:** Increment the version number in `package.json` and in `android/app/build.gradle` (and `capacitor.config.ts` if applicable).
2. **Build APK:** Run the necessary build commands (e.g., `npm run build`, `npx cap sync android`, and build via Gradle).
3. **Store Artifact:** Copy the resulting `.apk` file to the `releases/` directory at the project root. Name it appropriately (e.g., `app-v1.0.1.apk`).
4. **Generate Release Notes:** Create a markdown file (e.g., `releases/v1.0.1-notes.md`) detailing the changes, version bump, and app status.

When tasked with making a release, follow these steps precisely to ensure the agent correctly handles the APK and versioning.
