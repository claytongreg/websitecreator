<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Codebase Overview

EchoWebo is a password-gated AI website builder built on Next.js 16.2.2 App Router. The core product flows are a multi-step onboarding wizard in `src/app/dashboard/new/page.tsx`, an iframe-based visual editor in `src/app/editor/[siteId]/[pageSlug]/page.tsx`, Prisma-backed site/page persistence in `prisma/schema.prisma`, and a pluggable AI provider registry in `src/lib/ai/`.

**Stack**: Next.js 16.2.2, React 19, TypeScript, Tailwind CSS v4, Prisma/PostgreSQL, Zustand, OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, Grok.
**Structure**: `src/app` for routes and route handlers, `src/components/editor` and `src/components/onboarding` for the two main UI flows, `src/lib/editor` for editor state/utilities, `src/lib/ai` for model adapters, and `src/types/index.ts` for shared contracts.

For detailed architecture, data flow, gotchas, and navigation paths, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Changelog Policy

- Keep an `## [Unreleased]` section at the top of `.claude/changelogs/changelog.md`
- Add new work to the existing unreleased section until you are explicitly asked to run `/changelog`
- Use semantic versioning in `x.y.z` format
- When a release is cut, `package.json` is the version source of truth for both npm metadata and the in-app version badge

## Changelog Workflow

When asked to run `/changelog` or create a changelog entry, follow these steps:

### 1. Review the current work

Run in parallel:
- `git diff HEAD --stat`
- `git diff HEAD`
- `git log --oneline -20`

If there are untracked files, inspect them too. Only describe files that are part of the current change set.

### 2. Classify the release

Determine the next semantic version from the current repo version:
- **PATCH** (`x.y.+1`) for bug fixes, small improvements, docs/config updates
- **MINOR** (`x.+1.0`) for user-facing features or meaningful product improvements
- **MAJOR** (`+1.0.0`) for breaking changes

### 3. Update the changelog and version

Update `.claude/changelogs/changelog.md` and `package.json` together.

Format release entries as:

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- **Feature Name** - Brief user-facing description

### Changed
- **What Changed** - Brief user-facing description

### Fixed
- **Bug Name** - Brief user-facing description
```

Rules:
- Keep `## [Unreleased]` at the top after cutting a release
- Only include sections that have entries
- Keep each bullet to one concise line
- Bold the feature or area name, then add a short explanation
- Write for humans reading release notes, not as an implementation dump

### 4. Keep versions aligned

- Set `package.json` `version` to the release version
- Update `package-lock.json` if the root package version changes
- The app version shown in the UI must continue to read from `src/lib/version.ts`

### 5. Report clearly

After updating the files, report:
- The new version number
- A short summary of the release notes
- 2-6 concrete QA checks when the changes affect user-facing behavior
