<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> **Sync Policy**: Project-specific guidance. Shared workflow inherits from the root workspace [`../AGENTS.md`](../AGENTS.md), with Claude-specific notes in [`../CLAUDE.md`](../CLAUDE.md). Keep shared project facts aligned with [`CLAUDE.md`](CLAUDE.md).

EchoWebo is an AI-powered website builder with a password-gated dashboard, a multi-step site-generation wizard, and an iframe-based visual editor for full HTML pages.

## Tech Stack

- **Framework**: Next.js 16.2.2 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Base UI/shadcn wrappers
- **Data**: PostgreSQL + Prisma ORM
- **State**: Zustand for editor state/history
- **AI**: Provider registry in `src/lib/ai/` for OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, and Grok

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx prisma db push   # Push schema to database
npx prisma studio    # Database GUI
```

## Codebase Overview

EchoWebo is a password-gated AI website builder built on Next.js 16.2.2 App Router. The core product flows are a multi-step onboarding wizard in `src/app/dashboard/new/page.tsx`, an iframe-based visual editor in `src/app/editor/[siteId]/[pageSlug]/page.tsx`, Prisma-backed site/page persistence in `prisma/schema.prisma`, and a pluggable AI provider registry in `src/lib/ai/`.

**Stack**: Next.js 16.2.2, React 19, TypeScript, Tailwind CSS v4, Prisma/PostgreSQL, Zustand, OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, Grok.
**Structure**: `src/app` for routes and route handlers, `src/components/editor` and `src/components/onboarding` for the two main UI flows, `src/lib/editor` for editor state/utilities, `src/lib/ai` for model adapters, and `src/types/index.ts` for shared contracts.

For detailed architecture, data flow, gotchas, and navigation paths, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Project Structure

```text
src/
  app/
    dashboard/        # Site listing and onboarding entry
    editor/[siteId]/  # Visual editor route
    login/            # Password gate UI
    api/ai/           # AI generation, image, style extraction/generation
    api/sites/        # Site CRUD and generation pipeline
    api/pages/        # Page save/versioning
  components/
    editor/           # Iframe editor, toolbar, prompt bar, photo/theme tools
    onboarding/       # Wizard steps and page-tree builder
    ui/               # Base UI/shadcn wrappers and model selector
  lib/
    ai/               # Provider registry and adapters
    editor/           # Zustand store, DOM helpers, theme CSS
    db.ts             # Prisma singleton
    page-tree.ts      # Nested page-tree helpers
  types/              # Shared TypeScript contracts
prisma/
  schema.prisma       # 9 models for sites, pages, versions, inspirations, usage
```

## Conventions

- Middleware in `src/middleware.ts` protects most routes behind a password cookie set by `src/app/api/auth/login/route.ts`.
- The editor operates on stored HTML documents rendered inside an iframe, not on React component trees.
- AI backends register through side-effect imports in `src/lib/ai/index.ts`, while visible model choices are defined separately in `src/components/ui/ModelSelector.tsx`.
- Theme settings persist separately from page HTML and are regenerated into CSS for editor rendering.

## Notes

- `src/app/api/sites/route.ts` is the main site-generation and site-management hotspot.
- `README.md` is still the default create-next-app starter README and is not an accurate architecture reference.

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
