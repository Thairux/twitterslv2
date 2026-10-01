#Requires -Version 7
# verify-sprint.ps1 — Sprint close gate: typecheck + unit tests must be green.
# Usage: pwsh -NoProfile -File ./scripts/verify-sprint.ps1
$ErrorActionPreference = 'Stop'
npm run check
npm run test
Write-Host 'verify-sprint: GREEN' -ForegroundColor Green
