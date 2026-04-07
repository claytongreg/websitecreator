# EchoWebo

> **Sync Policy**: Project-specific guidance. For general workflow practices, see the root workspace [`../CLAUDE.md`](../CLAUDE.md).

AI-powered website builder. Users visually edit websites through clicking, typing, and AI prompts. Pay-as-you-go billing.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui** for the builder UI
- **PostgreSQL** + **Prisma** for data
- **Zustand** for editor state
- **OpenAI / Anthropic / Gemini** — pluggable AI provider system in `src/lib/ai/`

## Key Architecture

### Visual Editor (`src/components/editor/`)
- **EditorCanvas** renders user HTML in an iframe with injected interaction script
- Iframe script intercepts clicks → sends `postMessage` to parent with element path + metadata
- **SelectionToolbar** shows contextual actions (edit, delete, duplicate, AI edit)
- **AIPromptBar** at bottom — sends prompts to `/api/ai/generate` with current HTML + selected element context

### AI Provider System (`src/lib/ai/`)
- `provider.ts` — registry pattern. Each provider calls `registerProvider()` on import
- `index.ts` re-exports after importing all providers (triggers registration)
- Common interface: `generateText()` returns `AsyncIterable<string>`, `generateImage()` returns base64/URL
- Cost estimation via `estimateCost(modelId, inputTokens, outputTokens)`

### Onboarding (`src/components/onboarding/`)
- 4-step wizard: Inspiration → Description ��� Style → Generate
- Inspiration step scrapes reference URLs via `/api/ai/extract-style`
- Style step shows 3 AI-generated options (color palette + fonts + mood)

## Commands

```bash
npm run dev          # Start dev server
npx prisma db push   # Push schema to database
npx prisma studio    # Database GUI
```

## Directory Structure

```
src/
  app/
    dashboard/        # Site list + new site wizard
    editor/[siteId]/  # Visual editor
    api/ai/           # AI generation + style extraction
    api/sites/        # Site CRUD
    api/pages/        # Page save
  components/
    editor/           # EditorCanvas, SelectionToolbar, AIPromptBar, PageTree
    onboarding/       # InspirationStep, DescriptionStep, StylePreview, GeneratingView
    ui/               # shadcn/ui components
  lib/
    ai/               # Provider system (openai, anthropic, gemini)
    editor/           # Store (zustand), templates, HTML utils
    db.ts             # Prisma client singleton
  types/              # Shared TypeScript interfaces
```
