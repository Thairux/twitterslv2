# Bugs
Loop 2 browser validation findings (Sprint 7 SQMG Loop 1/2 pass).

| ID | Status | Severity | Area | Source | Evidence | Steps | Expected | Actual | Fix Note |
|---|---|---|---|---|---|---|---|---|---|
| BUG-004 | CLOSED | HIGH | ModelsPage.tsx | Browser | download row | Open Models > Search > Files | button always visible | button overflowed off-phone shell | made select flex-basis 0 with wrap, button wrapped in column |
| BUG-005 | CLOSED | MEDIUM | themes.css | Browser | viewport > 450px | open desktop browser | tabbar edges aligned to phone shell | right edge exceeded phone shell by ~4px | centered fixed tabbar with left 50% + translateX(-50%) |
| BUG-006 | CLOSED | MEDIUM | SearchPage.tsx | Browser | search tab | tap Go with query | search executes | nothing happened; id missing | wired Go button to search trigger and added missing input id |
| BUG-007 | CLOSED | MEDIUM | ModelsPage.tsx | Browser | downloads tab | start model download | cancel option | no cancel control | added Cancel button + cancelIds tracking + handleCancel |
| BUG-008 | CLOSED | MEDIUM | models.ts | Code | listCatalogue | load catalogue with downloads | hide downloaded repos | catalogue showed already downloaded entries | compare against downloaded repo names instead of full download ids |
| BUG-009 | CLOSED | LOW | ModelsPage.tsx | Browser | catalogue tab | fail catalogue load | user sees error | silent empty state | surface catalogue load errors in page error state |
| BUG-010 | CLOSED | MEDIUM | DMsPage.tsx | Browser | inbox | tap + New DM | recipient search flow | opened generic search posts tab | route to /search?tab=personas with SearchPage query param handling |
| BUG-011 | CLOSED | LOW | NotificationsPage.tsx | Browser | alerts | inspect quiet-hours controls | labeled time inputs | inputs had no labels | wrapped time inputs in labels with accessible text |

All Loop 2 findings are now CLOSED after fixes and validation (`npm run check`, `npm test`, `npm run build`).

Use this template for Loop 2 validation findings.

## BUG-001

- Status: CLOSED
- Severity: CRITICAL
- Area: Boot / secrets
- Source: User exploration
- Evidence: `bootstrap.ts` called `nativeSecrets.getModelEndpoint()` / `getApiKey()` without try/catch; secure storage failures crashed boot with raw "Initialization failed".
- Steps to reproduce:
  1. Corrupt or deny secure storage access
  2. Launch app
  3. Observe hard crash on bootstrap
- Expected: Graceful error with retry guidance.
- Actual: App shows generic initialization failure.
- Fix:
  Wrapped secret reads in try/catch with user-facing error message.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29

## BUG-002

- Status: CLOSED
- Severity: HIGH
- Area: Media / web
- Source: User exploration
- Evidence: `useBlobUrl` created object URLs without revoking prior URLs across re-renders, leaking memory.
- Steps to reproduce:
  1. Open a feed with multiple image posts
  2. Scroll to trigger mount/remount cycles
  3. Monitor memory / object URL count
- Expected: Old blob URLs revoked on cleanup.
- Actual: URLs accumulate.
- Fix:
  Track URLs in a ref and revoke all tracked URLs on cleanup.
- Verification:
  Manual review; E2E passes.
- Closed: 2026-09-29

## BUG-003

- Status: CLOSED
- Severity: HIGH
- Area: Data integrity / polls
- Source: User exploration
- Evidence: `votePoll` checked existing vote outside transaction; rapid taps could double-increment vote count.
- Steps to reproduce:
  1. Open a poll
  2. Tap Vote rapidly multiple times
  3. Observe vote count higher than expected
- Expected: One vote per user per poll.
- Actual: Count could exceed one due to race.
- Fix:
  Rely on unique constraint and catch duplicate vote errors; remove external check.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29

## BUG-004

- Status: CLOSED
- Severity: HIGH
- Area: Models / catalogue download
- Source: User report + SQMG Loop 2 browser exploration
- Evidence: On `http://localhost:5173/#/models`, Catalogue → Files, the
  selected GGUF `<select>` overflowed its card and measured
  `right=539` while the phone shell ended at `right=531`. The Download button
  followed at `left=547,right=658`, so it was outside the visible dev browser
  area and could not be used without horizontal scrolling.
- Steps to reproduce:
  1. Open the app in the browser dev view at a narrow viewport.
  2. Open Models and select Catalogue.
  3. Click Files on a catalogue entry.
  4. Inspect the file selector and Download action.
- Expected: The selector and Download action fit within the model card and
  remain visible.
- Actual: The long selector's intrinsic width pushes Download beyond the card
  and viewport.
- Fix: Made `.field-row` wrap in Models file rows; gave select a flexible
  basis with `minWidth: 0`; wrapped Download/Cancel controls in a stacked
  column so the primary action never leaves the card.
- Verification:
  Browser regression check shows `select.right=686.2`,
  `downloadBtn.right=805.4`, `card.right=821.4`, `phone.right=857.4`;
  no overflow.
- Closed: 2026-10-01

## BUG-005

- Status: CLOSED
- Severity: MEDIUM
- Area: Shell / bottom navigation
- Source: User report + SQMG Loop 2 browser exploration
- Evidence: In the same browser pass, `.phone` ended at `right=531.4` while
  `.tabbar` ended at `right=535.4`, crossing the shell boundary by 4px. The
  tab bar is fixed to the viewport/static position rather than anchored to the
  phone shell.
- Steps to reproduce:
  1. Open the app in the browser dev view.
  2. Navigate to Models or any page with enough content to scroll.
  3. Compare the bottom tab's right edge with the phone shell border.
- Expected: Bottom navigation aligns exactly with both shell borders.
- Actual: Bottom navigation extends past the right shell border.
- Fix: Centered the fixed tabbar with `left: 50%` and
  `transform: translateX(-50%)` while preserving the existing max-width and
  borders.
- Verification:
  Browser regression check shows `phone.left=407.4,right=857.4` and
  `tabbar.left=407.4,right=857.4`; exact alignment.
- Closed: 2026-10-01

## BUG-006

- Status: CLOSED
- Severity: MEDIUM
- Area: Search controls
- Source: SQMG Loop 1 critique + source inspection
- Evidence: `SearchPage`'s Go button calls
  `document.getElementById('search-input')?.focus()`, but the rendered search
  input has no `id="search-input"`. The button therefore has no observable
  effect.
- Steps to reproduce:
  1. Open Search.
  2. Enter a query.
  3. Click Go.
- Expected: Go focuses the search field or explicitly triggers the search.
- Actual: No element is found and no action occurs.
- Fix: Wired Go button to `searchTrigger` state; added `id="search-input"`
  and `useSearchParams` tab query-param support.
- Verification:
  Browser regression check shows search results update after clicking Go.
- Closed: 2026-10-01

## BUG-007

- Status: CLOSED
- Severity: MEDIUM
- Area: Models/download lifecycle
- Source: SQMG Loop 1 critique + source inspection
- Evidence: `ModelService` implements `cancelDownload()`, but
  `ModelsPage` never renders or invokes a Cancel control. A download in
  progress can only finish or fail; the user cannot intentionally stop it.
- Steps to reproduce:
  1. Start a model download from Search or Catalogue.
  2. While progress is active, inspect the available actions.
- Expected: A Cancel action is available and clears the partial download
  according to the service contract.
- Actual: No Cancel action is shown.
- Fix: Added `cancelIds` state, `handleCancel` wiring to
  `modelService.cancelDownload`, and Cancel buttons alongside Download in
  Search, Catalogue, and Downloads rows.
- Verification:
  Code review confirms Cancel control path exists; empty Downloads state
  verified in browser regression pass.
- Closed: 2026-10-01

## BUG-008

- Status: CLOSED
- Severity: MEDIUM
- Area: Models / catalogue state
- Source: SQMG Loop 1 critique + source inspection
- Evidence: `listCatalogue()` compares downloaded IDs against catalogue repo IDs,
  while completed download IDs are formed as `repoId/filename`. The comparison
  cannot match a completed file to its catalogue repo, so downloaded repos can
  remain listed in Catalogue.
- Steps to reproduce:
  1. Download a GGUF file from a catalogue repo.
  2. Return to or reload Catalogue.
  3. Inspect the previously downloaded repository.
- Expected: Catalogue state clearly reflects the downloaded file/repository.
- Actual: The repo-level filter uses incompatible identifier formats and may
  leave the repo listed.
- Fix: Changed `listCatalogue` deduplication to compare against downloaded
  repo names using `d.repo` instead of full download IDs.
- Verification:
  `npm run check`, `npm test`, and `npm run build` pass.
- Closed: 2026-10-01

## BUG-009

- Status: CLOSED
- Severity: LOW
- Area: Models / catalogue error handling
- Source: SQMG Loop 1 critique + source inspection
- Evidence: Catalogue loading catches `listCatalogue()` failures and replaces
  the catalogue with an empty array without setting the page's `error` state.
- Steps to reproduce:
  1. Open Catalogue while the HF request fails or is unavailable.
  2. Observe the Models page.
- Expected: The page explains that catalogue loading failed and offers retry
  guidance.
- Actual: The catalogue appears empty with no error explanation.
- Fix: Surfaced catalogue load errors via page `error` state with
  user-visible message.
- Verification:
  `npm run check`, `npm test`, and `npm run build` pass.
- Closed: 2026-10-01

## BUG-010

- Status: CLOSED
- Severity: MEDIUM
- Area: Direct messages / navigation
- Source: SQMG Loop 2 browser exploration
- Evidence: From the Inbox, clicking `+ NEW DM` navigates to `#/search`, but
  leaves the Search tab on Posts and provides no recipient picker or
  explanation that the user must switch to Personas/Dms. The resulting screen
  is not a DM composer and does not start a conversation.
- Steps to reproduce:
  1. Open Messages/Inbox.
  2. Click `+ NEW DM`.
  3. Observe the destination screen.
- Expected: A clear recipient-selection flow or a DM composer opens.
- Actual: A generic Search page opens on the Posts tab.
- Fix: Changed `+ NEW DM` to navigate to `/search?tab=personas`; SearchPage
  handles the `tab` query param.
- Verification:
  Browser regression check shows `+ NEW DM` opens `#/search?tab=personas`
  with Personas tab available.
- Closed: 2026-10-01

## BUG-011

- Status: CLOSED
- Severity: LOW
- Area: Notifications / accessibility
- Source: SQMG Loop 2 browser exploration
- Evidence: Quiet-hours inputs render as two unlabeled time controls separated
  by the text `to`. Browser accessibility inspection exposes them as generic
  inputs with no accessible name, unlike the labeled notification checkboxes.
- Steps to reproduce:
  1. Open Alerts/Notifications.
  2. Inspect the quiet-hours controls with browser accessibility tools.
- Expected: Each time control has an accessible label such as `Quiet hours
  start` and `Quiet hours end`.
- Actual: The controls have no labels or accessible names.
- Fix: Wrapped quiet-hours time inputs in label elements with accessible
  text.
- Verification:
  Browser regression check shows controls rendered as `Quiet start` and
  `Quiet end` inputs.
- Closed: 2026-10-01
