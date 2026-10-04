# Release Notes — TwitterSL v2 1.0.0

## Summary

Production-ready release of TwitterSL v2 with social interaction features, model management, and user onboarding improvements.

## Features

- Added Like and Repost buttons to all post cards across Feed, Thread, Profile, and Chatter
- Added Model Selector in Settings with automatic endpoint model discovery via `/v1/models`
- Added local downloaded model selection and persistence
- Expanded onboarding to 3-step walkthrough: welcome, how-it-works, first actions
- Added data export to JSON and full data reset with confirmation in Settings

## Fixes

- Fixed duplicate type declarations in SettingsPage
- Ensured all new components follow existing TSL token patterns
- Maintained four-layer architecture purity for all new code

## Verification

- `npm run check` — clean TypeScript
- `npm test` — 99 tests passing
- `npm run test:e2e` — 4 Playwright tests passing
- `npm run build` — production build succeeds

## Upgrade Notes

- Fresh install recommended for data reset functionality
- Existing local models and settings are preserved across version update
