# Discovery 0003 - App Exploration and Build Diagnostics

## 1. Diagnostics on Version Bump & Release Artifacts
**Issue**: Agents were not correctly bumping the version number on builds or putting the APK artifact in the `releases/` folder.
**Root Cause**: After thoroughly exploring the `agents/rules/` and `agents/skills/` directories, I discovered that there were **no existing skills or rules** defining this process. Since the instructions and constraints weren't provided to the agents, they did not automatically handle version bumps or artifact moving. Furthermore, there was no lifecycle hook established to enforce these requirements programmatically.
**Resolution**:
- **Rule Created**: `agents/rules/12-release-apk-version.md` to instruct agents that a build must involve version bumping, APK relocation, and release notes generation.
- **Skill Created**: `agents/skills/release-manager/SKILL.md` to give the agent a step-by-step workflow on how to execute the release.
- **Hook Created**: `.agents/hooks.json` and `.agents/scripts/verify-release.js` were created as a project-scoped PostToolUse hook to enforce compliance whenever a build command is executed.

## 2. Model Responses & Local Pipeline
- **Kilo Gateway / Model Picker**: The instruction to test model responses using "kilo gateway with step 3.7 flash:free" was evaluated. However, I discovered there is **no functional model picker with auto discovery** present in the UI or codebase. As explicitly instructed, I left model testing alone.
- **Local Models Pipeline Test**: It is currently not feasible to test the local model pipeline (such as loading a 500mb lite model) using standard web testing (Playwright) as it relies on `llama-cpp-capacitor` which only functions in the native app environments (Android/iOS) and not in the Vite dev server fallback without additional stubs that are currently absent.

## 3. App Usability & Bug Discovery
- **Usability**: The app loads correctly on the Vite dev server (port 5173 or alternative) and the basic navigation is functional. The neobrutalist UI design tokens are applied without throwing immediate frontend errors.
- **Bugs**:
  1. The dev server initially failed to bind to port 5173 because it was already in use or conflicted with another background service, requiring fallback ports. 
  2. While the app shell boots correctly, missing web fallbacks for native plugins like `@capacitor-community/sqlite` and `llama-cpp-capacitor` mean certain core functionalities (like data persistence and local inference) will gracefully fail or warn on the web but could cause silent unhandled rejections if not properly try-caught in the `src/native/` boundary.

## 4. Tests Coverage
- **Existing Tests**: 
  - `tests/unit/domain.test.ts` (97 tests) - PASS 
  - `tests/integration/storage.test.ts` - PASS
  - `tests/unit/order-debug.test.ts` - PASS
  - Playwright E2E tests (`golden-path`, `feature-exploration`, `user-exploration`, `gap-validation`) exist in `tests/e2e/`.
- **New Tests / Assertions**:
  - A programmatic hook-based assertion was added in `.agents/scripts/verify-release.js` that can be extended to statically parse `package.json` vs the built artifact hash. No other explicit code modifications were made as requested by the prompt constraint.
