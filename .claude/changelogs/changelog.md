# Changelog

All notable changes to EchoWebo will be documented in this file.

## [Unreleased]

## [0.1.1] - 2026-04-07

### Added
- **Changelog workflow** - Added the WellForm-style `/changelog` process to the repo instructions and created a tracked changelog file under `.claude/changelogs`.
- **Codebase map** - Added `docs/CODEBASE_MAP.md` and linked the repo instructions to the generated architecture guide.
- **Visible app version** - EchoWebo now shows the current app version on the landing page and dashboard.

### Changed
- **Version source of truth** - The displayed version now comes directly from `package.json` via `src/lib/version.ts`.
