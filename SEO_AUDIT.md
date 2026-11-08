# Laporan Audit SEO Menyeluruh: LustHub (lusthub.web.id)
**Dokumen:** `SEO_AUDIT.md`  
**Tanggal Audit:** 9 November 2026  
**Auditor:** Senior Technical SEO & Full-Stack Systems Engineer  
**Branch Kerja:** `seo-overhaul`  
**Status Audit:** FASE 0 — Audit Lengkap (Read-Only Codebase Analysis)

---

## 1. Framework, Versi & Mode Rendering Tiap Halaman

> [!NOTE]
> **Koreksi Data Awal:** Deskripsi pada prompt awal menyebutkan *"Vanilla JavaScript / HTML5 / CSS3 (Static Web App / Client-side SPA — Tanpa Framework)"*. Fakta aktual di codebase membuktikan website dibangun menggunakan **Next.js 16.2.9 (App Router) + React 19.2.4 + TailwindCSS v4 + PostgreSQL/Prisma**. Website ini **bukan Client-side SPA**, melainkan aplikasi modern berbasis SSR & ISR.

### Tabel Mode Rendering & Ketersediaan HTML Awal

| Tipe Halaman | Route Pattern | Mode Rendering | Cache / Revalidate | HTML Awal Siap Crawl? |
|---|---|---|---|:---:|
| **Beranda** | `/` | ISR (Server-Rendered) | `revalidate = 1800` (30 mnt) | ✅ **YA** (Title, H1, 15 kategori, 30 card video) |
| **Halaman Nonton** | `/watch/[id]` | ISR (Server-Rendered) | `revalidate = 21600` (6 jam) | ✅ **YA** (Title, H1, Player iframe, JSON-LD, Related) |
| **Kategori Spesifik** | `/category/[slug]` | ISR (Server-Rendered) | `revalidate = 3600` (1 jam) | ✅ **YA** (Title, H1, Teks Intro unik, 30 video, Pagination) |
| **Hub Kategori** | `/categories` | ISR (Server-Rendered) | `revalidate = 86400` (24 jam) | ✅ **YA** (Title, H1, Grid kategori lengkap, ItemList JSON-LD) |
| **Hasil Pencarian** | `/results` | Dynamic SSR | `s-maxage=300` (Cloudflare) | ✅ **YA** (Title, H1, Video grid, Pagination) |
| **Halaman Legal** | `/about`, `/dmca`, `/privacy`, `/terms`, `/compliance` | SSG (Static Pre-rendered) | Static Build Output | ✅ **YA** (Title, H1, H2, Seluruh teks legal) |
| **User Library** | `/library` | Dynamic SSR | `noindex, nofollow` | ✅ **YA** (Diblokir sengaja dari bot) |
| **API Endpoints** | `/api/*` | Dynamic Server Routes | Bervariasi per endpoint | ❌ (Internal API / Sitemap) |

**Verifikasi HTML Awal (Server-Side Rendering):**
Semua konten krusial—judul (`<title>`), meta deskripsi, canonical, H1, teks pengantar kategori, daftar kartu video, dan tautan internal—**sudah ter-render 100% di sisi server (HTML mentah)** sebelum JavaScript klien dijalankan. Googlebot dapat meng-crawl dan membaca konten tanpa perlu mengeksekusi JavaScript.

---

## 2. Inventaris Lengkap Route & Pola URL

| Route | URL Pattern Aktual | Tipe / Respon | Canonical Target |
|---|---|---|---|
| **Beranda** | `https://www.lusthub.web.id/` | 200 OK (ISR) | `https://www.lusthub.web.id` |
| **Halaman Nonton** | `/watch/{slug}-{id}` *(contoh: `/watch/step-sis-caught-me-2fPfA79DdjL`)* | 200 OK (ISR) | Self-referencing ke slug canonical |
| **Legacy Watch Query** | `/watch?v={id}` | 308 Permanent Redirect | Dialihkan ke `/watch/{id}` -> `/watch/{slug}-{id}` |
| **Legacy Video Route** | `/video/{id}` | 301 Redirect (via `next.config.ts`) | Dialihkan ke `/watch/{id}` |
| **Hub Kategori** | `/categories` | 200 OK (ISR) | `https://www.lusthub.web.id/categories` |
| **Landing Kategori Tier-1** | `/category/{slug}` *(15 kategori utama)* | 200 OK (ISR) | Self-referencing (`?page=N` jika halaman > 1) |
| **Pencarian / Filter** | `/results?search_query={q}` / `/results?order={order}` | 200 OK (SSR) | Self-referencing (⚠️ Risiko Indexing) |
| **User Library** | `/library` | 200 OK (noindex) | Header `X-Robots-Tag: noindex, nofollow` |
| **Halaman Legal** | `/about`, `/dmca`, `/privacy`, `/terms`, `/compliance` | 200 OK (SSG) | Self-referencing ke masing-masing halaman |
| **Sitemap Index** | `/sitemap.xml` | 200 OK (Rewritten ke `/api/sitemap-index`) | N/A (XML) |
| **Sitemap Segmen** | `/sitemap/{id}.xml` | 200 OK (Rewritten ke `/api/sitemap/{id}`) | N/A (XML) |
| **Health Check** | `/api/health` | 200 OK (JSON) | N/A |
| **Sync Cron** | `/api/cron/sync` | 200 OK (POST only, Bearer Token) | N/A |

---

## 3. Mekanisme Pengambilan Data API Pihak Ketiga

1. **Sumber Data:** Eporner API v2 (`https://www.eporner.com/api/v2/video/`).
2. **Sisi Pengambilan (Server vs Client):** **100% di server**. Browser pengguna tidak pernah melakukan request langsung ke API Eporner (menghindari CORS, kebocoran query, dan throttling IP klien).
3. **Arsitektur Caching 4 Lapis:**
   - **Lapis 1 (In-Memory Map):** `lib/api/eporner.ts` menggunakan memory cache (`memCache`, max 2.000 entri) dengan TTL 30 menit (pencarian) dan 6 jam (detail video).
   - **Lapis 2 (Next.js Fetch Disk Cache):** `fetch(url, { next: { revalidate: SEARCH_TTL } })` menyimpan payload di disk `.next/cache/fetch-cache/`, bertahan saat restart server.
   - **Lapis 3 (Database PostgreSQL):** Video aktif disimpan di tabel PostgreSQL `"Video"`. Halaman `/watch/[id]` memeriksa database lokal terlebih dahulu (`getCachedVideoById`). Jika ada dan berstatus `ACTIVE`, langsung di-serve dari DB tanpa memanggil Eporner API.
   - **Lapis 4 (Edge CDN Cloudflare):** Header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` di `next.config.ts` menginstruksikan Cloudflare menyajikan cache di edge CDN.
4. **Rate Limiting & Batas Gemini API:**
   - Eporner API: Dibatasi aman oleh cache 4 lapis.
   - Gemini API: Menggunakan model `gemini-3.5-flash-lite` di `/api/cron/sync` (bukan saat request user). Dibatasi `MAX_NEW_PER_RUN = 2` video per 15-30 menit untuk memastikan tetap berada di bawah batas gratis 15 RPM / 500 RPD.

---

## 4. Status Elemen SEO Teknis (Checklist Komprehensif)

| Elemen SEO | Status | Analisis & Bukti di Codebase |
|---|:---:|---|
| **`robots.txt`** | ✅ ADA / BAIK | Dikonfigurasi di `app/robots.ts`. Mengizinkan `/`, memblokir `/api/`, `/library`, `/watch?v=`, dan query parameter berlebih (`/?page=`, `/?order=`, `/results?page=`). Menunjuk ke `${baseUrl}/sitemap.xml`. |
| **`sitemap.xml`** | ⚠️ PARSIAL / KURANG | Sitemap Index (`/sitemap.xml`) dan segmen (`/sitemap/{id}.xml`) berfungsi. Segmen 0 memuat rute statis & 15 kategori Tier-1; segmen 1..N memuat video dari DB. **Kekurangan Kritis:** Sitemap video **tidak memiliki tag Google Video Sitemap extension** (`<video:video>`, `<video:thumbnail_loc>`, `<video:title>`, `<video:player_loc>`, dll.). |
| **Tag `<title>`** | ✅ ADA / BAIK | Unik di setiap halaman via App Router metadata. Template default: `%s — LustHub`. Panjang title konsisten 45–60 karakter. |
| **`meta description`** | ✅ ADA / BAIK | Unik di setiap halaman: Beranda (132 char), Kategori (140-155 char unik), Watch (dinamis dari `aiDescription` atau template 120-150 char). |
| **Canonical URL** | ✅ ADA / BAIK | Didefinisikan di `metadata.alternates.canonical` pada seluruh route publik. URL bersih berdomain tunggal. |
| **Open Graph & Twitter Card** | ✅ ADA / BAIK | OG Title, Description, Image (`/opengraph-image` atau thumbnail video), dan Type (`website` atau `video.other`) lengkap. |
| **Struktur Heading (H1)** | ⚠️ PARSIAL | Tepat satu `H1` di setiap halaman. Namun pada halaman `/watch/[id]`, dari H1 langsung melompat ke `H3` (`Recommended`) tanpa `H2`. Pada `/categories` dan `/results` juga melompat langsung ke H3. |
| **Tag `alt` Gambar** | ⚠️ PARSIAL | Gambar thumbnail video di `VideoCard.tsx` memiliki `alt={video.title}`. Namun `<img>` tidak memiliki atribut eksplisit `width` dan `height` (hanya CSS `aspect-video`), yang berpotensi memicu Cumulative Layout Shift (CLS). Kategori di `CategoriesClient` memakai CSS background image tanpa semantic image. |
| **Structured Data (JSON-LD)** | ⚠️ PERLU PERBAIKAN | **WebSite:** Terpasang di `app/layout.tsx` dan terduplikasi di `app/(user)/page.tsx`.<br>**Organization:** Terpasang di beranda.<br>**BreadcrumbList:** Terpasang di halaman watch dan kategori.<br>**VideoObject:** Terpasang di watch page (`name`, `description`, `thumbnailUrl`, `uploadDate`, `duration`, `embedUrl`, `interactionStatistic`). `contentUrl` tepat dihilangkan.<br>**ItemList:** Terpasang di `/categories`. |
| **Halaman 404** | ⚠️ TIDAK LENGKAP | Mengembalikan status HTTP 404 asli, tetapi **belum ada file kustom `app/not-found.tsx`**. Hanya mengandalkan tampilan default Next.js ("404 This page could not be found") tanpa link ke beranda atau kategori. |
| **HTTPS & www vs non-www** | ✅ BAIK | Menggunakan satu domain kanonik (`https://www.lusthub.web.id`). Header `Strict-Transport-Security: max-age=31536000` terpasang di `next.config.ts`. Redirect non-www ditangani di Cloudflare Edge. *(Catatan: ada inkonsistensi komentar di file `robots.ts` yang menyebut target non-www, perlu dirapikan)*. |
| **Halaman Legal** | ✅ LENGKAP | `/about`, `/dmca`, `/privacy`, `/terms`, dan `/compliance` (2257) lengkap dengan teks detail, canonical, dan ditautkan di sidebar footer. |

---

## 5. Audit Crawlability Navigasi & Pagination

- **Navigasi Utama & Sidebar:** 100% menggunakan komponen `<Link href="...">` dari Next.js (menghasilkan tag `<a href="...">` standar). Mesin pencari dapat merambat (*crawl*) seluruh menu tanpa terhambat.
- **Kartu Video (`VideoCard.tsx`):** Dibungkus oleh `<Link href={buildWatchUrl(video.id, video.title)}>`. Tautan mengarah langsung ke URL slug deskriptif.
- **Kategori di Beranda:** Baris "Browse Categories" di beranda merender tautan `<Link>` ke seluruh 15 kategori Tier-1 di HTML awal (kedalaman klik hanya 1 dari homepage).
- **Pagination:** Pada Beranda, Kategori, dan Hasil Pencarian, tombol `Previous` dan `Next` menggunakan `<Link href={getPageUrl(...)}>` dengan atribut `href` yang valid, bukan tombol `onClick` JavaScript.
- **Kesimpulan:** Navigasi dan pagination **100% crawlable**. Tidak ada jebakan JavaScript-only routing.

---

## 6. Potensi Duplikasi URL & Indeksasi Halaman Tipis

1. **Halaman Pencarian Internal (`/results`):**
   - Saat ini halaman `/results?search_query=...` memancarkan tag canonical self-referencing dan **tidak memiliki tag `noindex`**.
   - Ini bertentangan dengan Google Webmaster Guidelines (Google melarang keras indeksasi hasil pencarian internal karena menghasilkan jutaan halaman tipis / *thin content* yang membuang crawl budget dan berisiko penalti algoritma).
2. **Watch Page Slug Redirect (307 vs 308):**
   - Di `generateMetadata`, ketidakcocokan slug dialihkan dengan `permanentRedirect` (308).
   - Namun di `WatchVideoPage` (body), baris 184 menggunakan `redirect(canonicalPath)` yang secara default di Next.js menghasilkan status **307 Temporary Redirect**. Seharusnya menggunakan `permanentRedirect` agar PageRank ditransfer 100%.
3. **Duplikasi Skema `WebSite`:**
   - Didefinisikan di `app/layout.tsx` (baris 74-87) dan kembali didefinisikan di `app/(user)/page.tsx` (baris 94-107). Dua deklarasi WebSite pada satu halaman dapat membingungkan parser Google Rich Results.

---

## 7. Analisis Performa & Core Web Vitals (CWV)

1. **Embed Video Player Langsung (Iframe):**
   - Pada `VideoPlayer.tsx`, iframe Eporner dimuat secara langsung saat halaman dibuka (bukan fasad klik-untuk-putar).
   - *Konteks Historis:* Fasad klik-untuk-putar sengaja dihindari sebelumnya karena Googlebot Video Indexer membutuhkan player video yang langsung tampak di DOM agar tidak memicu error *"Video tidak ada di halaman tonton"*.
   - *Dampak Performa:* Memuat iframe pihak ketiga langsung meningkatkan Total Blocking Time (TBT) dan Largest Contentful Paint (LCP) bagi pengguna riil.
2. **Iklan Pihak Ketiga (Adsterra):**
   - Skrip iklan sitewide (`AdsterraSitewide.tsx`) dan banner memuat skrip eksternal dari domain pihak ketiga (`glamournakedemployee.com`). Meskipun memakai `strategy="afterInteractive"`, skrip iklan tetap merupakan kontributor terbesar penurunan performa CWV di perangkat mobile.
3. **Optimasi Gambar & Dimensi:**
   - Thumbnail video di `VideoCard.tsx` memakai tag `<img>` biasa tanpa atribut `width` dan `height` numerik (hanya mengandalkan class CSS `aspect-video`). Pada koneksi lambat, ini dapat memicu CLS sebelum stylesheet selesai diurai browser.
4. **Font:**
   - Sudah optimal: Menggunakan `next/font/google` (`Inter`, `Plus_Jakarta_Sans`, `JetBrains_Mono`) yang otomatis di-self-host oleh Next.js tanpa memanggil server eksternal Google Fonts saat runtime.
5. **Koneksi Database saat Build:**
   - Terdeteksi saat `npm run build` lokal: log error `relation "Video" does not exist` karena string koneksi database menunjuk ke IP internal Docker Pterodactyl (`172.18.0.78`). Next.js menangani ini dengan aman melalui blok `try/catch` fallback sehingga build tetap berstatus sukses (exit code 0).

---

## 8. Rekapitulasi Temuan & Prioritas Perbaikan

Berikut adalah daftar temuan audit yang disusun berdasarkan tingkat dampak terhadap traffic organik dan indeksasi Google:

| No | Temuan Masalah | Tingkat Dampak | Estimasi Usaha | Fase Rencana |
|:---:|---|:---:|:---:|:---:|
| **1** | **Ketiadaan Google Video Sitemap XML (`<video:video>` tags):** Sitemap video hanya memuat URL biasa tanpa metadata video (thumbnail, title, duration, embed player). Ini adalah alasan utama Google lambat atau gagal mengindeks video ke tab Video Search. | 🔴 **KRITIS** | Sedang (2-3 jam) | **Fase 1** |
| **2** | **Halaman Pencarian Internal (`/results`) Masuk Indeks:** Halaman pencarian internal tidak diberi `noindex` dan memancarkan canonical sendiri, memicu duplicate content dan pemborosan crawl budget. | 🔴 **KRITIS** | Rendah (30 mnt) | **Fase 1** |
| **3** | **Ketiadaan Halaman 404 Kustom (`app/not-found.tsx`):** Pengunjung dan bot yang menemukan URL rusak disajikan halaman default hitam-putih Next.js tanpa navigasi, memutuskan rantai perayapan (*crawl dead-end*). | 🟠 **TINGGI** | Rendah (1 jam) | **Fase 2** |
| **4** | **Ketidakkonsistenan Status Redirect Watch Page (307 vs 308):** Pengalihan slug URL lama/bare ID menggunakan `redirect()` (307 Temporary) di body komponen, bukan `permanentRedirect()` (308 Permanent). | 🟠 **TINGGI** | Sangat Rendah (15 mnt) | **Fase 1** |
| **5** | **Duplikasi JSON-LD `WebSite` Schema:** Skema WebSite di-generate dua kali di `layout.tsx` dan `page.tsx`. | 🟡 **SEDANG** | Sangat Rendah (15 mnt) | **Fase 3** |
| **6** | **Hirarki Heading Melompat (H1 langsung ke H3):** Pada halaman nonton, kategori, dan hasil pencarian, tidak ada tag `<h2>` antara H1 dan H3. | 🟡 **SEDANG** | Rendah (30 mnt) | **Fase 2** |
| **7** | **Potensi CLS pada Tag Thumbnail (`<img>` tanpa atribut width/height):** Tag thumbnail hanya bergantung pada CSS aspect ratio. | 🟡 **SEDANG** | Rendah (30 mnt) | **Fase 4** |
| **8** | **Kerapihan Dokumentasi Domain:** Komentar di `app/robots.ts` menyebut www -> non-www, padahal domain kanonik produksi adalah `https://www.lusthub.web.id`. Perlu diselaraskan. | 🟢 **RENDAH** | Sangat Rendah (10 mnt) | **Fase 1** |

---

## Rekomendasi & Langkah Selanjutnya

Audit Fase 0 telah selesai dilakukan secara menyeluruh tanpa mengubah kode fungsional aplikasi. Seluruh temuan telah dicatat di atas dan disimpan di file `SEO_AUDIT.md`.

Sesuai instruksi pada **Aturan Utama & Cara Kerja**:
> *"Setelah selesai, tampilkan ringkasan temuan dan tunggu persetujuan saya sebelum lanjut ke Fase 1."*

Mohon tinjau ringkasan temuan audit di atas. Jika Anda setuju, silakan balas dengan kata **"lanjut"** untuk memulai pengerjaan **FASE 1: Fondasi Crawling dan Indexing**.