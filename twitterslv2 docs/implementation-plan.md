# Implementation Plan — TwitterSL v2 Gap Closure

## Objectives
- Close all local-first implementation gaps identified in `competitor-gap-analysis.md`.
- Fix type-safety, schema, and error-handling issues.
- Add missing UI flows for polls, media, settings, and simulation.
- Keep `npm run check`, `npm run test`, `npm run test:e2e`, and `npm run build` passing.
- Do NOT introduce cloud/egress features without explicit approval.

## Phase 1 — Critical Fixes (No Approval Needed)
1. Fix mute-filtering logic bug in `social-store.ts` (`listFollowing` → `listMuted` for muted personas).
2. Replace `any` cast in `SearchPage` poll hydration with a clean `SocialStore.getPoll` method.
3. Add DB indexes for new tables (`polls`, `poll_options`, `muted_words`, `generated_images`).
4. Remove duplicate dynamic/static import of `world-events.ts` to fix Vite chunk warning.
5. Add vote button and persistence in `PostCard` for polls.
6. Wire daily event rotation to app lifecycle (feed refresh) instead of boot-only.
7. Replace silent-failure swallows with non-blocking UI/log feedback.

## Phase 2 — Missing Local-First Features (No Approval Needed)
1. **Media upload UI**: add file picker + blob path storage + visible render in PostCard.
2. **Poll voting UX**: vote button, per-user vote dedup (local), results lock.
3. **Thread composer**: multi-post draft queue in ComposerPage.
4. **Post scheduling**: local-only draft/schedule queue; no cloud.
5. **Advanced search filters**: add filters UI in SearchPage (persona, date, tag).
6. **Block feature**: add block list + enforce in feed/search.
7. **Notification persistence**: store notifications locally, show unread count, mark read.
8. **Report queue UI**: local review list in Settings/Admin.
9. **Image placeholder upgrade**: render generated image cards with prompt text and timestamp.
10. **World event refresh**: rotate on feed tab switch + periodic timer.

## Phase 3 — Documentation & Verification
1. Update `twitterslv2 docs/workflow/index.md` with new flows.
2. Update `twitterslv2 docs/competitor-gap-analysis.md` status after fixes.
3. Run `npm run check`, `npm run test`, `npm run build`, `npm run test:e2e`.
4. Run Playwright user-exploration loop and document findings.

## Approval Required (Do Not Implement Without Explicit Approval)
- Push notifications (FCM/APNS)
- Real AI image generation (cloud/model endpoint spend)
- Video/GIF transcoding/storage
- Cloud-backed search/embeddings
- Analytics/telemetry egress
- Monetization/subscriptions/ads
