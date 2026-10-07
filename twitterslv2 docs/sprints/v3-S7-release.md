# Sprint v3-S7 — Reply audience, LOWs, river, onboarding, icon, 3.0.0

## Goal
v18 schema, deferred LOWs cleared, Chatter river, first-run routing,
fixed icon, release hardening → 3.0.0.

## Changes
- Schema v18: `ALTER TABLE posts ADD COLUMN reply_control TEXT
  DEFAULT 'everyone'` + `muted_word_rules(word PK, surfaces TEXT,
  expires_at NULL)` (migrate `muted_words` rows; code switches).
  Composer selector; ThreadPage + respondToPost enforcement (friend
  always allowed); onboarding auto-route (agent_config first-run flag
  + App guard) with refreshed copy (DMs/Search/personas/#tslp/
  creator).
- Chatter → media-only trending river (rankFeed filtered image posts).
- Icon: centered-geometry regeneration of ALL densities + foregrounds
  + circular-mask render verification (UB-05).
- Release: version 3.0.0, versionCode 16, CHANGELOG, release notes +
  manifest + quality-summary, `release:verify`, signed APK, GitHub
  Release, adb update attempt.
- SQM loops to green; new tests per sprint; e2e additions (providers,
  inference states, stories, audience).

## Acceptance
- Audience gates enforced incl. personas; LOWs closed; river renders
  media only; first-run routes; icon verified pixel-level; 3.0.0
  tagged Latest; check/test/e2e/build green.
