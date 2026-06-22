# SEO Monitoring Guide — LustHub

A living reference for search-engine observability, crawl health, and indexing quality.

---

## 1. Search Console Setup (One-Time — Operator Action Required)

### Step 1 — Add Property
- Go to: https://search.google.com/search-console
- Click **+ Add Property** → choose **URL prefix**
- Enter: `https://lusthub.web.id`

### Step 2 — Verify Ownership
**Recommended method: DNS TXT record** (survives Docker rebuilds and domain moves)
```
Host:  lusthub.web.id
Type:  TXT
Value: google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXX
```
Copy the value from GSC → add via your DNS provider (Cloudflare, Namecheap, etc.)

**Alternative: HTML meta tag** (requires code deploy)
In `app/layout.tsx`, inside the root `metadata` object:
```ts
verification: {
  google: "XXXXXXXXXXXXXXXXXXXXXXXX",
},
```
Replace X with your verification code from GSC.

### Step 3 — Submit Sitemap
After verification (usually within 5 minutes of DNS propagation):
1. Go to: **Sitemaps** in GSC left sidebar
2. Enter: `sitemap.xml`
3. Click **Submit**
4. Wait 24–48h for first indexing report

### Step 4 — Configure URL Inspection (Bookmark these)
Save these to your browser bookmarks for quick access:
- URL Inspection tool: `https://search.google.com/search-console/inspect`
- Coverage report: `https://search.google.com/search-console/index`
- Performance report: `https://search.google.com/search-console/performance/search-analytics`

---

## 2. Routes and Indexing Expectations

| Route | Expected Index State | Schema | Notes |
|---|---|---|---|
| `/` | ✅ Indexed | WebSite + Organization | ISR 30min |
| `/categories` | ✅ Indexed | ItemList (Tier-1 cats) | ISR daily |
| `/category/[slug]` | ✅ Indexed | CollectionPage + BreadcrumbList | ISR 1hr |
| `/watch/[id]` | ✅ Indexed | VideoObject | force-dynamic |
| `/results` | 🔶 Indexed with canonical | None | Query-specific canonicals |
| `/about` | ✅ Indexed | None | Low priority |
| `/terms`, `/privacy`, `/dmca`, `/compliance` | ✅ Indexed | None | Legal pages — low value |
| `/library` | ❌ NOT indexed | — | noindex + robots.txt disallow |
| `/api/*` | ❌ NOT indexed | — | robots.txt disallowed |

---

## 3. Weekly Monitoring Checklist (5 minutes)

Run these checks every 7 days:

```bash
# 1. Verify health endpoint
curl -sf https://lusthub.web.id/api/health

# 2. Verify sitemap is serving
curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/sitemap.xml
# Expected: 200

# 3. Check robots.txt
curl -sf https://lusthub.web.id/robots.txt | grep -E "Disallow|Sitemap"

# 4. Check a category page canonical
curl -sf https://lusthub.web.id/category/japanese | grep -i "canonical"
# Expected: <link rel="canonical" href="https://lusthub.web.id/category/japanese"/>

# 5. Check worker sync health (no ERROR lines = healthy)
docker compose logs --since 24h worker | grep -c ERROR
# Expected: 0 or very low
```

**In Google Search Console:**
- [ ] Pages → Total Indexed — is it growing or stable? (red flag: sudden drop)
- [ ] Coverage → Errors tab — new 404s or server errors?
- [ ] Enhancements → Breadcrumbs — any new errors on category pages?

---

## 4. Monthly Monitoring Checklist (30 minutes)

### Performance Analysis
1. GSC → Performance → set date range to **last 28 days**
2. Sort by **Impressions** descending → identify top landing pages
3. Check **CTR** on top 10 pages:
   - CTR < 1% = weak title/description → consider updating metadata
   - CTR > 5% = strong performer → protect these pages, don't change metadata
4. Check **Position** column:
   - Position 4–10 = "striking distance" — prioritize internal link building to these pages
   - Position > 30 = low visibility — review content quality

### Coverage Analysis
1. GSC → Coverage → Excluded tab
2. Review "Crawled - currently not indexed":
   - Few results = normal
   - Hundreds of results = investigate which pages are being discovered but not indexed
3. Review "Duplicate, Google chose different canonical than user":
   - Any category or watch pages here = canonical mismatch, investigate immediately
4. Review "Soft 404":
   - Any results here = investigate which pages are returning empty content

### Sitemap Freshness Check
```bash
# Check if sitemap was recently updated
curl -sf https://lusthub.web.id/sitemap.xml | grep -o '<lastmod>[^<]*</lastmod>' | tail -5
# Dates should be within last 24 hours for recently synced content

# Check segment count
curl -sf https://lusthub.web.id/sitemap.xml | grep -c '<sitemap>'
# Should match expected segment count (1 static + N video segments)
```

### Schema Validation
Test 3 random pages with Google Rich Results Test:
- https://search.google.com/test/rich-results

Test pages:
1. Any watch page: `https://lusthub.web.id/watch/{any-recent-id}`
2. Any category page: `https://lusthub.web.id/category/japanese`
3. Homepage: `https://lusthub.web.id/`

Expected schema detections:
- Homepage → Website, Organization
- Category → CollectionPage, BreadcrumbList
- Watch → VideoObject

---

## 5. Quarterly Audit Checklist (2 hours)

### Broken Link Audit
Use [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) (free, up to 500 URLs) or [ahrefs](https://ahrefs.com/broken-link-checker):
1. Crawl `https://lusthub.web.id`
2. Filter: **Response codes → 4xx**
3. For any 404 internal links: update the source page or add a redirect in `next.config.ts`

### Content Quality Review
Identify categories at risk:
1. In GSC → Performance → filter by URL: `/category/`
2. Categories with **< 100 impressions/month** = potentially thin
3. For thin categories: consider adding more unique intro text or removing from sitemap

### Category Config Review
Open `lib/category-config.ts` and review:
- [ ] Are all 15 TIER1_CATEGORIES still valid content areas?
- [ ] Do any need updated `title`, `description`, or `intro` text?
- [ ] Should any new categories be elevated to Tier-1?
- [ ] Are any Tier-1 categories actually returning < 5 videos? (use Eporner API to check)

### Redirect Health Check
```bash
# Verify legacy /video/ redirect still works (must be 301)
curl -sI https://lusthub.web.id/video/TESTID | grep -i "http\|location"
# Expected: HTTP/1.1 301 and Location: https://lusthub.web.id/watch/TESTID

# Verify legacy /watch?v= redirect (should be 308)
curl -sI "https://lusthub.web.id/watch?v=TESTID" | grep -i "http\|location"
# Expected: HTTP/1.1 308 and Location: https://lusthub.web.id/watch/TESTID

# If using Cloudflare Page Rule for /watch?v= → should be 301 instead of 308
```

### Core Web Vitals Review
1. GSC → Experience → Core Web Vitals
2. Check for "Poor" URLs in both mobile and desktop
3. For any Poor LCP: investigate ISR cache hit rate and image loading

---

## 6. Crawl Anomaly Response Playbook

### Scenario: Sudden drop in indexed pages (> 20% in 1 week)

1. Check GSC → Coverage → "Valid" count trend
2. Check if `robots.txt` was accidentally modified: `curl https://lusthub.web.id/robots.txt`
3. Check if `noindex` was accidentally added site-wide in `app/layout.tsx`
4. Check if Docker web container is responding: `curl -sf https://lusthub.web.id/api/health`
5. Check Cloudflare for any WAF rules accidentally blocking Googlebot
6. Check if Eporner API is down (watch pages would return 500 → temporary issue)

### Scenario: Soft-404 spike

1. GSC → Coverage → Soft 404 list
2. For paginated category pages (e.g., `/category/japanese?page=50`): confirm `notFound()` guard is active
3. For watch pages: check if videos were mass-removed from DB without sitemap update
4. For results pages: check if empty query param is being indexed

### Scenario: Duplicate canonical selection

1. GSC → Coverage → "Duplicate, Google chose different canonical than user"
2. Investigate which pages are in conflict
3. Check if `metadataBase` in `app/layout.tsx` is correct
4. Run URL Inspection on the affected page — GSC shows which canonical Google selected

### Scenario: VideoObject schema errors

1. GSC → Enhancements → Videos
2. Open Rich Results Test on affected pages
3. Common issues:
   - Missing `thumbnailUrl`: video has no thumbnail in Eporner API response
   - Missing `uploadDate`: video has no `added` field
   - Missing `duration`: video has `length_sec = 0`
4. These are data quality issues from Eporner API — no code changes needed

---

## 7. Crawl Budget Considerations

### URLs Google Should NOT Waste Crawl Budget On
Already handled in `robots.txt`:
```
Disallow: /api/
Disallow: /library
Disallow: /?*gay=
Disallow: /?*lq=
Disallow: /?*order=
Disallow: /?*q=
Disallow: /watch?v=
```

### URL Parameter Risk Monitoring
Watch for these patterns in GSC → Coverage → Excluded → "Blocked by robots.txt":
- If count is very high (thousands): good, robots is working
- If count is zero: robots.txt might not be serving correctly

### Pagination Discovery
Category pagination URLs (`/category/slug?page=N`) are intentionally discoverable:
- They're not in sitemap (only page 1 is)
- Canonical always points to page 1
- Google follows `<link rel="next/prev">` (not implemented — future consideration)
- The empty-page guard ensures no soft-404s on out-of-range pages

---

## 8. Stale Content Pruning

When to remove a category from TIER1_CATEGORIES:
1. The Eporner API returns < 5 videos for the category for 3+ consecutive months
2. The category has 0 impressions in GSC for 6+ months
3. The category name is returning irrelevant results from the API

Process:
1. Remove the slug from `TIER1_CATEGORIES` in `lib/category-config.ts`
2. Add a redirect in `next.config.ts`: `/category/old-slug` → `/categories` (301)
3. Remove from sitemap automatically (it uses TIER1_CATEGORIES)
4. Submit the updated sitemap in GSC

---

## 9. Key SEO KPIs to Track

| KPI | Target | Measurement |
|---|---|---|
| Total indexed pages | Growing monthly | GSC → Coverage → Valid |
| Category pages indexed | 15/15 (all Tier-1) | GSC → Coverage + URL filter |
| Watch pages indexed | > 50% of active DB videos | GSC + DB count comparison |
| Homepage impressions | Growing month-over-month | GSC → Performance |
| Category page avg position | Moving below 20 over time | GSC → Performance + URL filter |
| VideoObject schema valid | 0 errors | GSC → Enhancements → Videos |
| BreadcrumbList valid | 0 errors | GSC → Enhancements → Breadcrumbs |
| Soft 404 count | 0 | GSC → Coverage → Soft 404 |
| Crawl errors (5xx) | 0 sustained | GSC → Coverage → Server errors |
| Core Web Vitals (LCP) | < 2.5s | GSC → Experience → Core Web Vitals |

---

## 10. Useful External Tools

| Tool | Purpose | URL |
|---|---|---|
| Google Rich Results Test | Schema validation | https://search.google.com/test/rich-results |
| Google URL Inspection | Individual page crawl state | GSC → URL Inspection |
| Screaming Frog (free) | Broken link crawl, up to 500 URLs | https://www.screamingfrog.co.uk/seo-spider/ |
| robots.txt tester | Validate which URLs are blocked | https://search.google.com/search-console/robots-txt |
| Schema.org validator | Validate JSON-LD manually | https://validator.schema.org/ |
| PageSpeed Insights | Core Web Vitals real data | https://pagespeed.web.dev/ |
| Cloudflare Cache Purge | Force-refresh CDN after deploy | Cloudflare Dashboard → Caching |
