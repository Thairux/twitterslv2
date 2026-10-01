# Competitor Gap Analysis — TwitterSL v2 (Final Critique)

## Pass 3 Fixes Applied
- Daily event rotation wired into app boot via `rotateDemoEvent`
- Unread notification highlighting in NotificationsPage
- Visible image placeholder with emoji/frame in PostCard
- Polls fully implemented: creation, storage, rendering, hydration

## Final Feature Comparison

| Feature | X/Twitter | Threads | TwitterSL v2 | Gap |
|---------|-----------|---------|--------------|-----|
| Feed (For You / Following) | ✅ | ✅ | ✅ | None |
| Compose post | ✅ | ✅ | ✅ | None |
| Reply thread | ✅ | ✅ | ✅ | None |
| Like / Repost | ✅ | ✅ | ✅ | None |
| Bookmark | ✅ | ❌ | ✅ | None |
| Quote post | ✅ | ❌ | ✅ | None |
| Post editing | ✅ | ✅ | ✅ | None |
| Polls | ✅ | ❌ | ✅ | None |
| Media placeholder | ✅ | ✅ | ✅ | None |
| Advanced search | ✅ | Partial | Partial | **Medium** |
| DM search | ✅ | ❌ | ✅ | None |
| Notifications | ✅ Push | ✅ Push | ✅ In-app + unread | **Medium** |
| Mute/Block | ✅ | ✅ | Mute + mute words | None |
| Privacy controls | ✅ | ✅ | ✅ | None |
| Profile edit | ✅ | ✅ | ✅ | None |
| Background simulation | ❌ | ❌ | ✅ UI-triggered | Unique |
| Model downloads | ❌ | ❌ | ✅ | Unique |
| Offline-first local-first | ❌ | ❌ | ✅ | Unique |
| Daily event rotation | ❌ | ❌ | ✅ | Unique |

## Remaining Gaps — Categorized

### Closed (local-first achievable)
- Quote posts, post editing, polls
- DM search, mute words, privacy controls
- Background simulation controls
- Daily world-event rotation logic
- Visible media placeholders
- Unread notification highlighting

### Medium Gap (requires cloud/infrastructure)
- Push notifications (requires FCM/APNS or cloud relay)
- Real AI image generation (requires model endpoint + rendering pipeline)
- Video/GIF uploads (requires transcoding/storage)
- Advanced search ranking (requires vector embeddings or cloud index)

### Product Decision Gap
- Long-form posts (MAX_POST_LEN=280 is intentional for microblogging sim)
- Analytics/views (not applicable for offline-first local sim)
- Creator tools/scheduling (outside local-first scope)
- Monetization/subscriptions (outside local-first scope)

## Verdict
The app’s core local-first, AI-persona, offline-simulation value proposition is feature-complete and commercially viable for its intended niche. Remaining gaps are either cloud-dependent or product-scope decisions, not implementation gaps.
