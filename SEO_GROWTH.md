# SEO Growth Strategy — LustHub

A living reference for sustainable, web-first traffic acquisition, engagement optimization, and content scaling.

**Architecture constraints:**
- Web-first. Browser-first. SEO-first.
- No external messaging platforms. No bots. No automation dependencies.
- Low operational complexity. High maintainability. Long-term crawl stability.

---

## 1. Traffic Acquisition Model

### Active Channels (In Production)

| Channel | Implementation | Notes |
|---|---|---|
| Organic Search | 15 Tier-1 category pages + VideoObject schema + sitemaps | Primary acquisition |
| Direct / Return | ContinueWatching row on homepage (UIContext localStorage) | Return visitor retention |
| Social Share | `ShareButton` on all watch pages (Web Share API + clipboard) | Passive distribution |
| Internal Discovery | Related categories, Browse pills, "See more" CTAs | Session depth |

### Acquisition Priorities (Ordered)

1. **Organic search** — SEO-optimized category pages are the primary growth engine. Every Tier-1 page with unique content compounds over time.
2. **Internal discovery** — Every user who arrives via search should find a second, third page without friction. Related categories, continuation CTAs, and the video grid are the funnel.
3. **Direct / return traffic** — The "Continue Watching" row makes repeat sessions feel personalized. A returning visitor is worth 3× a new visitor (no acquisition cost).
4. **Social sharing** — The `ShareButton` enables native mobile sharing and clipboard copy. OG metadata ensures every shared URL renders a rich preview. Zero operational overhead.

### What Is Intentionally Not Pursued

| Channel | Reason |
|---|---|
| Telegram / messaging platforms | Removed from architecture. Adds operational complexity, external dependencies, and maintenance burden without proportional SEO value. |
| Email newsletters | Requires email infrastructure, consent flows, unsubscribe management. Not aligned with lightweight architecture goal. |
| Push notifications | Service worker complexity, consent friction, poor user experience on adult content platforms. |
| User accounts | Major schema change. Personalization needs are served adequately by localStorage-based UIContext. |
| Affiliate / referral programs | Operational complexity. Not the current growth phase. |

---

## 2. SEO Scaling — Category Expansion

### Current Tier-1 Category Pages (15)

| Slug | Search Intent | Status |
|---|---|---|
| `/category/japanese` | Very High | ✅ Active |
| `/category/milf` | Very High | ✅ Active |
| `/category/teen` | Very High | ✅ Active |
| `/category/amateur` | High | ✅ Active |
| `/category/lesbian` | High | ✅ Active |
| `/category/asian` | High | ✅ Active |
| `/category/big-tits` | High | ✅ Active |
| `/category/anal` | High | ✅ Active |
| `/category/hd-porn` | Medium-High | ✅ Active |
| `/category/ebony` | Medium | ✅ Active |
| `/category/homemade` | Medium | ✅ Active |
| `/category/indian` | Medium | ✅ Active |
| `/category/interracial` | Medium | ✅ Active |
| `/category/hentai` | Medium | ✅ Active |
| `/category/latina` | Medium | ✅ Active |

### Tier-2 Expansion Candidates

Evaluate only after 6 months of GSC data. Do NOT add prematurely.

Candidates (highest-intent, meaningful differentiation from existing 15):
- `creampie` — High intent
- `pov` — High intent
- `mature` — Medium-High intent (overlaps MILF — audit carefully)
- `threesome` — Medium intent
- `big-ass` — Medium intent
- `blonde` — Medium intent

### Rules Before Adding Any New Category Page

All 4 conditions must be met:

1. **Content**: Eporner API returns >25 videos for the category name consistently (check over 3 sync cycles)
2. **Demand**: GSC shows impressions for the keyword among existing content, OR the keyword has clear high search volume
3. **Differentiation**: The category has meaningful content differentiation from the existing 15 (not just a synonym or sub-niche)
4. **Quality**: A unique, human-written `intro` paragraph is ready (not AI-generated boilerplate)

### How to Add a New Category (Step by Step)

1. Add entry to `TIER1_CATEGORIES` in [`lib/category-config.ts`](e:\00%20projek%20rumah\antigravity\kumpulenak3\lib\category-config.ts):

```ts
{
  slug: "your-slug",
  name: "Exact Eporner API Search Term",  // must match API exactly
  imageId: "XX",                           // Eporner category image ID
  title: "Category Name Porn Videos",
  description: "Unique, 150-160 chars. Includes primary keyword naturally.",
  intro: "2-3 sentences. Unique to this category. No boilerplate.",
  related: ["slug1", "slug2", "slug3"],    // related Tier-1 slugs
}
```

2. Test the page locally: `http://localhost:3000/category/your-slug`
3. Confirm videos load (not an empty grid)
4. Verify schema renders: Rich Results Test on the live URL
5. Submit updated sitemap in Google Search Console

### When NOT to Add a New Category

- Category returns <10 videos in Eporner API
- Category is a sub-niche of an existing Tier-1 (use `/results?search_query=` instead)
- No unique intro paragraph available
- GSC shows no existing impressions or interest

---

## 3. Internal Recommendation System

The current internal linking architecture creates discovery chains:

```
Homepage → Category Page → Watch Page → Related Category
    ↑                                          ↓
    └──────────── "See more" CTA ←─────────────┘
```

### Current Implementation

| Element | Location | Purpose |
|---|---|---|
| Category chips (15) | Homepage page 1 | Authority flow: home → categories |
| ContinueWatching row | Homepage page 1 | Return visitor retention |
| Browse pills (up to 3) | Watch page | Watch → Category funnel |
| Related categories | Category page | Category → Category linking |
| "See more {keyword}" CTA | Watch page sidebar | Session continuation |
| Hashtag links in description | Watch page | Long-tail discovery |
| Sidebar Top Categories (5) | All pages | Site-wide category authority |

### Opportunities Not Yet Implemented (Backlog)

**Option A: "New Since Your Last Visit" indicator**
- Read `lastVisitAt` from `localStorage`, stored on each visit
- On homepage: count videos newer than `lastVisitAt`
- Show subtle "🔴 N new since last visit" near the video grid header
- Cost: ~10 lines, zero API calls, zero performance impact

**Option B: Category Visit History Shortcuts**
- Store recently-visited category slugs in `sessionStorage` (session-scoped only)
- Show last 3 category visits in sidebar as quick-access links
- Renders nothing for first-time visitors — no layout shift
- Cost: ~30 lines, additive sidebar section

**Option C: Popular-in-Category Signal on VideoCard**
- For category pages: sort by views descending and show "🔥 Popular" badge on top 3 videos
- Pure client-side rendering from the existing video data (no API change)
- Adds a reason to click beyond the thumbnail
- Cost: ~10 lines in VideoCard, prop change in category page

---

## 4. Return Visitor Optimization

### Current State

| Feature | Implementation | Storage |
|---|---|---|
| Watch history | UIContext `watchHistory` (50 videos, deduplicated) | `localStorage` key `lusthub_history` |
| Liked videos | UIContext `likedVideos` | `localStorage` key `lusthub_likes` |
| Continue Watching | `ContinueWatching.tsx` (homepage, last 3 videos) | Reads from UIContext |

### Return Visitor Journey

```
User returns to homepage →
  ContinueWatching row shows last 3 watched videos →
  User clicks → /watch/{id} →
  addToHistory() updates the row for next visit
```

### Improving Return Retention (Backlog Priority Order)

1. **"New Since Last Visit" count** — passive, lightweight, high perceived value
2. **Category shortcuts from history** — "You watched Japanese last time" → link
3. **Liked videos count in sidebar** — "You have 7 liked videos" → `/library?tab=likes`

### What to Avoid

- No login walls
- No cookie-based tracking
- No cross-session server-side state
- No personalization that requires backend computation

Everything must be `localStorage`/`sessionStorage` only — client-side, privacy-safe, zero server load.

---

## 5. Social Share Architecture

### Current Implementation

```
ShareButton (on every watch page)
  ├── navigator.share() → native OS sheet (mobile Chrome, Safari iOS)
  └── navigator.clipboard → copy link + "Copied!" toast (desktop)

OG metadata (on every watch page)
  ├── og:title   = video title (cleaned)
  ├── og:image   = dynamic Next.js OG image via /watch/[id]/opengraph-image
  ├── og:url     = https://lusthub.web.id/watch/{id}
  └── og:type    = video.other
```

### Share Quality Checklist (Monthly)

1. Paste a watch URL into https://opengraph.xyz/ — verify thumbnail loads
2. Share a watch URL from an iPhone → verify native share sheet appears
3. Share a watch URL on desktop → verify "Copied!" toast appears
4. Paste the copied URL into a chat → verify OG preview renders correctly

### Improving Share Quality (Backlog)

- If OG thumbnail is missing: check `video.default_thumb.src` null handling in `app/(user)/watch/[id]/opengraph-image.tsx`
- If OG title looks spammy: improve `cleanEpornerText()` in `lib/api/eporner.ts`
- If share rate is < 0.2%: consider adding share count display (social proof)

---

## 6. Analytics Events Reference

All events fire to Plausible via `lib/analytics.ts`. No cookies. No PII.

| Event | Props | Where | What to Measure |
|---|---|---|---|
| `search_submit` | `query_length: number` | Topbar search | Search engagement rate |
| `sidebar_cat_click` | `category: string` | Sidebar nav | Which categories drive sidebar clicks |
| `category_cta_click` | `category, from_video` | Watch page Browse pills | Watch→Category conversion |
| `see_more_click` | `keyword: string` | Watch page continuation | Session extension rate |
| `share` | `method: native\|clipboard` | ShareButton | Share rate per watch page view |
| `continue_watching_click` | `position: number` | Homepage return row | Return visitor engagement |

### KPI Targets (3-Month Window)

| Metric | Target | Source |
|---|---|---|
| Pages/session | >2.5 | Plausible |
| Bounce rate | <55% | Plausible |
| Share rate | >0.3% of watch views | Plausible `share` event |
| Continue watching CTR | >5% of returning sessions | Plausible `continue_watching_click` |
| Organic impressions | Growing month-over-month | Google Search Console |
| Category page avg position | Moving below 20 over time | Google Search Console |

---

## 7. Crawl Budget + Sitemap Stability

### URL Inventory

| Route | Pages | In Sitemap | Crawl Priority |
|---|---|---|---|
| `/` | 1 | Static sitemap | High |
| `/category/[slug]` | 15 | Static sitemap | High |
| `/categories` | 1 | Static sitemap | Medium |
| `/watch/[id]` (recent) | ~700/week | Video sitemap (seg 1) | High |
| `/watch/[id]` (older) | Thousands | Video sitemap (seg 2+) | Medium |
| `/results` | Not indexed | — | Low |
| Legal pages | 5 | Static sitemap | Low |
| `/library` | 1 | Blocked (noindex + robots) | None |
| `/api/*` | — | Blocked (robots) | None |

### ISR / Cache Architecture

| Route | Cache Strategy | TTL |
|---|---|---|
| Homepage | ISR | 30 minutes |
| Category pages | ISR | 1 hour |
| `/categories` | ISR | 24 hours |
| Watch pages | `force-dynamic` | No cache (always fresh) |
| Sitemap | ISR | 1 hour |

### Scaling Rules

- **Do not** add `force-dynamic` to category or home pages — ISR is intentional
- **Do not** disable ISR to fix stale content — reduce the `revalidate` value instead
- **Do not** add more than 1,000 URLs per sitemap segment (current limit: 50,000)
- Watch page count will grow indefinitely — monitor sitemap segment count quarterly

---

## 8. Monthly Growth Review Checklist

**Run on the 1st of each month:**

### Search Console
- [ ] Total indexed pages: growing or stable? (sudden drop = investigate)
- [ ] Top 10 category pages by impressions — are they growing?
- [ ] Any category pages on position 4–10? (striking distance → add internal links)
- [ ] Any new soft-404s? (Coverage → Soft 404)
- [ ] Any crawl errors (5xx)? (Coverage → Server errors)
- [ ] Sitemap: all segments returning 200?

### Plausible
- [ ] What is the share rate (`share` events / watch page views)?
- [ ] What is the `continue_watching_click` rate vs. homepage sessions?
- [ ] Which categories are generating the most `category_cta_click` from watch pages?
- [ ] Which `sidebar_cat_click` categories are most popular?

### Content Quality
- [ ] Do all 15 Tier-1 category pages still return >10 videos from Eporner?
- [ ] Are any category intros outdated or clearly boilerplate?
- [ ] Any Tier-2 candidates ready for promotion? (see Section 2)

### Technical
- [ ] Health endpoint responding: `curl https://lusthub.web.id/api/health`
- [ ] OG images rendering correctly on 2 watch pages (test via opengraph.xyz)
- [ ] Worker sync running: Docker logs show no sustained ERROR lines
- [ ] DB: video count growing (ACTIVE status)?

---

## 9. Architecture Principles (Non-Negotiable)

These constraints apply to all future growth work:

| Principle | Implication |
|---|---|
| **Web-first** | Growth must work without external platforms or apps |
| **SEO-first** | Every content page must be crawlable, indexable, and canonical |
| **Browser-first** | Personalization uses localStorage/sessionStorage only — no server-side user state |
| **Zero external messaging** | No Telegram, no WhatsApp, no push, no email — browser native only |
| **Low operational complexity** | No new infrastructure. No new env vars for distribution. No bots. |
| **Crawl stability** | URL structure is frozen. No URL changes without 301 redirects. |
| **Privacy-safe** | No cookies for analytics. Plausible is the only analytics provider. |
| **Rollback-safe** | Every new feature must be removable by deleting one import. |
