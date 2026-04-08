# EchoWebo

> **Sync Policy**: Project-specific guidance. For general workflow practices, see the root workspace [`../CLAUDE.md`](../CLAUDE.md).

AI-powered website builder with a password-gated dashboard, a multi-step site-generation wizard, and an iframe-based visual editor for full HTML pages.

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

66 mapped source/config files across 5 page routes, 7 route handlers, 6 editor components, 5 onboarding components, 7 AI provider adapters, and 9 Prisma models. The main product flows are onboarding -> site generation, editor iframe selection/editing, and AI-assisted HTML, style, and image generation.

For detailed architecture, module guide, data flows, gotchas, and navigation paths, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

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
- Treat `package.json` as the single source of truth for the shipped app version

## Changelog Workflow

When asked to run `/changelog` or create a changelog entry:

1. Review the current work with `git diff HEAD --stat`, `git diff HEAD`, and `git log --oneline -20`.
2. Decide whether the release is patch, minor, or major.
3. Update `.claude/changelogs/changelog.md` and `package.json` together.
4. Keep `## [Unreleased]` at the top of the changelog after versioning.
5. Sync `package-lock.json` when the root package version changes.
6. Preserve `src/lib/version.ts` as the source for the UI version badge.

Release entry format:

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
- Only include sections that have entries
- Keep bullets concise
- Prefer user-facing descriptions over implementation detail
