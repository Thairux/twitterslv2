# Quickstart

## Requirements

- Node 20 LTS
- npm
- Android Studio only when building the Android shell
- macOS + Xcode only when building the iOS shell

```powershell
npm install
npm run dev         # browser preview, http://localhost:5173
npm run check       # TypeScript close gate
npm run test        # Vitest unit + integration
npm run test:e2e    # Playwright browser flows
npm run build       # typecheck + Vite production build
```

Native shells:

```powershell
npm run build
npm run cap:sync
npm run cap:android  # Android Studio
npm run cap:ios      # macOS/Xcode only
```

The first launch seeds the starter personas, including one guaranteed friend.
Set **Model Endpoint URL** and its API key in Settings to enable endpoint
generation. Without them, the simulation uses deterministic offline pools.
Model downloads are optional and are stored as filesystem blobs with metadata
in SQLite.

## Project workflow

Before changing code, read `agents/skills/aboutrepo/SKILL.md`,
`AGENTS.md`, and the three documents named by the mandatory first-load rule.
For a sprint, load the matching project-scoped skill from
`agents/skills-lock.json`. Run `npm run check` plus the relevant tests before
stopping, and update the sprint history and active handoff.
