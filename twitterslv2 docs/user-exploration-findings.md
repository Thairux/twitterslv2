# User Exploration Findings

## Loop 1 — Initial Smoke Test
- **Test**: `tests/e2e/user-exploration.spec.ts`
- **Status**: Passed after fixing hash-router navigation
- **Findings**:
  - HashRouter requires `/#/path` for direct navigation in Playwright
  - Models page title is "HF Models Hub", not "Models"
  - All core pages render: Feed, Search, Profile, Notifications, DMs, Settings, Models

## Loop 2 — Deep Feature Exploration
- **Test**: `tests/e2e/feature-exploration.spec.ts`
- **Status**: Passed
- **Findings**:
  - Compose with poll creation works
  - Search page renders
  - Settings page renders with simulation controls
  - Models page renders

## Critical Bug Found and Fixed
- **Bug**: Store methods returned DB rows with snake_case column names (`author_id`, `display_name`, etc.) but domain types expected camelCase (`authorId`, `displayName`, etc.). The unsafe `as Post` / `as Persona` casts hid this at compile time but caused runtime crashes when accessing `post.authorId` (which was `undefined`).
- **Error**: `Cannot read properties of undefined (reading '0')` in `PostCard` when rendering `name[0]`
- **Fix**: Added explicit row mapping helpers (`mapPostRow`, `mapPersonaRow`, `mapReplyRow`) in `src/lib/api/store.ts` and fixed all affected methods (`listPosts`, `getPost`, `listReplies`, `listPersonas`, `getPersona`, `listMemories`, `getUserProfile`, `listWorldEvents`, `getActiveWorldEvent`, `listDms`).

## Secondary Bug Found and Fixed
- **Bug**: Web SQLite adapter (`src/native/db.ts`) regex for `INSERT` didn't support `INSERT OR IGNORE` / `INSERT OR REPLACE` modifiers.
- **Error**: `Invalid INSERT: INSERT OR IGNORE INTO muted_words ...`
- **Fix**: Updated `execInsert` regex to `^INSERT\s+(?:OR\s+(?:IGNORE|REPLACE)\s+)?INTO\s+...`

## Current Status
- `npm run check` ✅
- `npm run test` ✅ 99 tests
- `npm run build` ✅
- `npm run test:e2e` ✅ 3 tests

## Remaining Exploration (Next Loop)
- Poll voting UX in feed
- Media upload preview in PostCard
- Quote post flow end-to-end
- Edit post flow end-to-end
- Block/unblock enforcement in feed/search
- Notification unread state persistence
- World event banner rotation on feed tab switch
