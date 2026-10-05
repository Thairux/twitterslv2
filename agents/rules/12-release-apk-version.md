---
title: Release APK and Version Bump
description: Enforces bumping the version number and moving the APK to the releases folder on builds.
---

# Release APK and Version Bump

Whenever a build is requested or performed (specifically Android builds resulting in an APK):
1. The version number in `package.json` and `android/app/build.gradle` (or `capacitor.config.ts`) MUST be bumped.
2. The generated APK artifact MUST be copied/moved to the `releases/` directory.
3. A release note or documentation for this version MUST be generated in the `releases/` folder.

Do not declare a release complete until these steps are verified.
