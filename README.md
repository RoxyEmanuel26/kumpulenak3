# LustHub: Architecture & Governance

LustHub is a web-first, SEO-driven adult entertainment platform built on Next.js 16 (App Router). The repository is now in **long-term maintenance mode**.

The primary goals of this repository are stability, maintainability, minimal dependencies, and strict SEO compliance.

## 1. Architectural Philosophy

- **Web-First & Browser-Focused**: We rely strictly on the open web. There are no proprietary messaging apps, bots, or community platforms integrated into this core.
- **Zero-State Server**: The server handles purely static and dynamic rendering of SEO-safe content. There are no users, no logins, no authentication systems, and no session management. 
- **Client-Side Personalization**: All personalization (like the "Continue Watching" row and "Likes") is stored in browser `localStorage`.
- **Native Standards**: We prefer native browser APIs and built-in Node.js features (e.g., native `fetch` over `axios`).

## 2. Core Technologies

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Automation**: BullMQ & Redis (used for syncing external video catalogs)
- **Styling**: Tailwind CSS + Shadcn UI primitives

## 3. Routing Patterns

Do not break or modify these routing patterns, as they are the foundation of our SEO footprint:

- `/` → Homepage (Static, high priority)
- `/categories` → All Categories Hub
- `/category/[slug]` → Tier-1 curated category landing pages
- `/results` → Fallback search engine (does NOT canonicalize index)
- `/watch/[id]` → Canonical video player page

## 4. Automation & Sync Worker

Background syncing of content runs via `workers/sync.ts`. 
This worker leverages the Gemini API to classify videos and generate SEO metadata. 
- **Drift Prevention**: The worker strictly maps AI-generated categories to our `TIER1_CATEGORIES` list in `lib/category-config.ts`. If the AI hallucinates, the category is discarded.
- **Transactional Safety**: Database inserts for videos and their relations are atomic.

## 5. Quality Control (QC) Suite

We maintain a zero-dependency anti-entropy suite located in `scripts/qc/`.
Run this suite locally to verify the integrity of the SEO structure before deployments:
```bash
npm run build
npm run start
# In a new terminal:
npm run qc
```
This suite automatically verifies:
- SEO tag presence (`<title>`, `<meta>`, canonicals, OpenGraph)
- Sitemap limits and 200 OK responses
- Internal linking structures and orphan detection

## 6. AI Contribution Rules

If you are an AI assistant editing this repository, you **must** obey `.cursorrules` and `AGENTS.md`. 
1. Do not introduce new dependencies unless absolutely necessary.
2. Do not introduce Redux, Zustand, or global state.
3. Keep the architecture predictable and localized. Avoid abstracting functions or components purely for stylistic reasons.
