# Panduan Tindakan Manual Pemilik Situs (Operator Checklist)
**Dokumen:** `CHECKLIST_MANUAL.md`  
**Target Domain:** `https://www.lusthub.web.id`  
**Proyek:** LustHub SEO Overhaul & GSC Fixes  
**Versi:** 2.0 (Solusi Diagnostik Riil GSC & Penyempurnaan Sistem)

---

> [!IMPORTANT]
> Dokumen ini berisi instruksi operasional yang **harus diselesaikan oleh pemilik/pengelola situs** karena membutuhkan akses langsung ke panel kontrol Cloudflare, Google Search Console, Bing Webmaster Tools, dan akses terminal VPS produksi.
> 
> Seluruh perbaikan kode di sisi aplikasi (`next.js`, `sitemap.xml`, `robots.txt`, `error.tsx`, `manifest.ts`) telah selesai diimplementasikan. Ikuti langkah di bawah ini untuk mengaktifkannya di lingkungan live.

---

## Daftar Isi
1. [Langkah 1: Mengatasi 233 Error HTTP 403 Forbidden di Cloudflare WAF](#langkah-1-mengatasi-233-error-http-403-forbidden-di-cloudflare-waf)
2. [Langkah 2: Deployment Kode & Purge Cache Cloudflare](#langkah-2-deployment-kode--purge-cache-cloudflare)
3. [Langkah 3: Mengatasi 731 Halaman 'Crawled not Indexed' via Batch Enrichment](#langkah-3-mengatasi-731-halaman-crawled-not-indexed-via-batch-enrichment)
4. [Langkah 4: Melakukan 'Validasi Perbaikan' (Validate Fix) di GSC](#langkah-4-melakukan-validasi-perbaikan-validate-fix-di-gsc)
5. [Langkah 5: Verifikasi Google Search Console & Submit Ulang Sitemap Index](#langkah-5-verifikasi-google-search-console--submit-ulang-sitemap-index)
6. [Langkah 6: Permintaan Indeksasi Manual (URL Inspection Tool)](#langkah-6-permintaan-indeksasi-manual-url-inspection-tool)
7. [Langkah 7: Bing Webmaster Tools & Protokol IndexNow](#langkah-7-bing-webmaster-tools--protokol-indexnow)
8. [Langkah 8: Konfigurasi Analitik Privasi](#langkah-8-konfigurasi-analitik-privasi)
9. [Langkah 9: Jadwal Pemantauan Mingguan](#langkah-9-jadwal-pemantauan-mingguan)
10. [Langkah 10: 3 Strategi Promosi Alternatif di Luar Google Search](#langkah-10-3-strategi-promosi-alternatif-di-luar-google-search)

---

## Langkah 1: Mengatasi 233 Error HTTP 403 Forbidden di Cloudflare WAF

Google Search Console melaporkan **233 halaman "Diblokir karena akses dilarang (403)"**. Hal ini disebabkan oleh fitur keamanan Cloudflare (*Bot Fight Mode* atau aturan WAF Managed Rules) yang secara keliru menantang atau memblokir bot mesin pencari resmi.

### Cara Mengatasi (Bypass Verified Bots di Cloudflare):
1. Login ke dashboard [Cloudflare](https://dash.cloudflare.com/) dan pilih domain `lusthub.web.id`.
2. Di sidebar kiri, buka menu **Security** $\rightarrow$ **WAF** $\rightarrow$ tab **Custom rules**.
3. Klik tombol **Create rule**.
4. Isi konfigurasi berikut:
   - **Rule name:** `Allow Verified Search Engine Bots (Bypass WAF)`
   - **Field / Expression:**
     - Klik **Edit expression** dan masukkan:
       ```text
       (cf.client.bot)
       ```
     - *(Artinya: Jika pengunjung adalah bot terverifikasi resmi oleh Cloudflare, seperti Googlebot, Bingbot, Yandex, DuckDuckGo, dll.)*
   - **Choose action:** Pilih **Skip**
   - **WAF components to skip:** Centang semua opsi:
     - [x] *All remaining custom rules*
     - [x] *WAF Managed Rules*
     - [x] *Rate limiting rules*
     - [x] *Super Bot Fight Mode / Bot Management*
5. Klik **Deploy**.
6. Dengan aturan ini, **233 error HTTP 403 akan hilang** dan Googlebot dapat merayapi situs tanpa hambatan captcha/challenge.

---

## Langkah 2: Deployment Kode & Purge Cache Cloudflare

Setelah seluruh perbaikan kode pada branch `seo-overhaul` selesai diuji secara lokal, gabungkan (*merge*) ke branch utama dan deploy ke VPS:

### A. Di Mesin Lokal / Git:
```bash
# Pindah ke branch main dan merge perbaikan
git checkout main
git merge seo-overhaul
git push origin main
```

### B. Di Server VPS:
```bash
# 1. Masuk ke direktori projek
cd /path/to/kumpulenak3

# 2. Tarik kode terbaru
git pull origin main

# 3. Build ulang container Docker produksi
docker compose build --no-cache web

# 4. Restart container web
docker compose up -d web

# 5. Cek log pastikan container running dan sehat (healthy)
docker compose logs --tail=50 web
```

### C. Purge Cache di Cloudflare:
1. Buka dashboard Cloudflare $\rightarrow$ **Caching** $\rightarrow$ **Configuration**.
2. Klik tombol **Purge Everything** (Bersihkan Semua).
3. Ini memastikan HTML baru yang memuat Breadcrumbs, Video Facade, Error Boundary, PWA Manifest, dan Schema JSON-LD langsung disajikan ke pengunjung dan Googlebot.

---

## Langkah 3: Mengatasi 731 Halaman 'Crawled not Indexed' via Batch Enrichment

Google menolak mengindeks 731 halaman video karena halaman tersebut dinilai sebagai agregator tanpa konten teks orisinal (*thin content*). Kita telah membangun pipeline pengayaan Gemini AI di `scripts/seo/enrich-videos.ts` untuk menghasilkan sinopsis unik, highlight, dan FAQ.

### Menjalankan Batch Enrichment di Server:
1. Di VPS, jalankan perintah enrichment untuk memproses batch video:
   ```bash
   # Menjalankan pemrosesan batch 50 video teratas:
   npm run seo:enrich -- --limit=50
   ```
2. Periksa status pengayaan:
   ```bash
   npm run seo:report
   ```
3. **Mengaktifkan Cron Otomatis di Server (Crontab):**
   Tambahkan baris berikut ke crontab server (`crontab -e`) agar enrichment berjalan otomatis setiap 2 jam (aman dari kuota gratis Gemini):
   ```cron
   0 */2 * * * cd /path/to/kumpulenak3 && npm run seo:enrich -- --limit=20 >> /var/log/lusthub-seo-enrich.log 2>&1
   ```
4. **Mengaktifkan Gating Indeksasi (`ENFORCE_INDEXING_GATE`):**
   Di file `.env` produksi di VPS, tambahkan:
   ```env
   ENFORCE_INDEXING_GATE=true
   ```
   *Efek:* Video yang belum diperkaya AI akan otomatis diberi tag `noindex, follow` dan dikecualikan dari sitemap. Hanya video yang sudah memiliki sinopsis orisinal dan FAQ yang diserahkan ke Google, menjamin rasio indeksasi 100% dan mengangkat reputasi domain.

---

## Langkah 4: Melakukan 'Validasi Perbaikan' (Validate Fix) di GSC

Setelah deployment Langkah 2 dan 3 selesai, buka kembali dashboard **Google Search Console**:

1. Buka menu **Indexing > Pages**.
2. Pada tabel **Penyebab halaman tidak diindeks**, klik baris masalah berikut satu per satu:
   - **Diblokir karena akses dilarang (403):** Klik tombol **Validasi Perbaikan** (*Validate Fix*). Googlebot akan mengetes ulang URL tersebut melalui Cloudflare WAF yang sudah di-bypass.
   - **Soft 404:** Klik tombol **Validasi Perbaikan**. Kode baru kini mengembalikan HTTP 404 asli jika kategori/video kosong.
   - **Error server (5xx):** Klik tombol **Validasi Perbaikan**. Error boundary `app/error.tsx` telah aktif mencegah crash 500.
   - **Dikecualikan oleh tag 'noindex':** Klik tombol **Validasi Perbaikan**.
3. Status validasi akan berubah dari *Gagal* menjadi *Dimulai* (*Started*), dan Google akan memprosesnya dalam 3–7 hari.

---

## Langkah 5: Verifikasi Google Search Console & Submit Ulang Sitemap Index

1. Buka menu **Indexing > Sitemaps** di Google Search Console.
2. Jika sitemap lama berstatus error atau berisi URL usang, hapus sitemap lama (klik titik tiga di kanan atas $\rightarrow$ *Hapus peta situs*).
3. Masukkan kembali sitemap index baru:
   ```text
   sitemap.xml
   ```
4. Klik **Submit**. Status harus menunjukkan **Sukses** (*Success*).
5. Googlebot akan membaca sitemap index yang kini mencakup:
   - `https://www.lusthub.web.id/sitemap/0.xml` (Rute statis, 16 kategori Tier-1, dan halaman `/contact`).
   - `https://www.lusthub.web.id/sitemap/1.xml` (Video aktif dengan Google Video Sitemap `<video:video>` tag).

---

## Langkah 6: Permintaan Indeksasi Manual (URL Inspection Tool)

Untuk halaman-halaman pilar (*hub categories*) yang menjadi sumber traffic utama:

1. Di kotak pencarian paling atas GSC ("Inspect any URL in 'lusthub.web.id'"), tempelkan URL berikut:
   - `https://www.lusthub.web.id/`
   - `https://www.lusthub.web.id/categories`
   - `https://www.lusthub.web.id/category/japanese`
   - `https://www.lusthub.web.id/category/asian`
   - `https://www.lusthub.web.id/category/milf`
   - `https://www.lusthub.web.id/category/indonesia`
   - `https://www.lusthub.web.id/contact`
2. Klik tombol **Test Live URL** (Uji URL Langsung) untuk memastikan respon 200 OK dan terdeteksinya schema JSON-LD.
3. Klik tombol **Request Indexing** (Minta Pengindeksan).

---

## Langkah 7: Bing Webmaster Tools & Protokol IndexNow

Bing dan DuckDuckGo sangat ramah terhadap konten video hiburan:

1. Buka [Bing Webmaster Tools](https://www.bing.com/webmasters) dan login.
2. Impor properti domain `lusthub.web.id` dari Google Search Console.
3. Di menu **Sitemaps**, masukkan `https://www.lusthub.web.id/sitemap.xml` dan submit.
4. **IndexNow:** Untuk memberi tahu mesin pencari seketika setiap ada video baru tanpa menunggu bot merayapi sitemap, gunakan kunci IndexNow statis di `public/` dan kirim ping HTTP POST ke `https://api.indexnow.org/indexnow`.

---

## Langkah 8: Konfigurasi Analitik Privasi

Sesuai aturan arsitektur LustHub (tanpa cookies invasif dan tanpa merusak skor Core Web Vitals):

1. **Cloudflare Web Analytics (Rekomendasi Utama):**
   - Di dashboard Cloudflare, buka **Analytics & Logs** $\rightarrow$ **Web Analytics**.
   - Aktifkan fitur ini secara instan (0 script di codebase, tanpa beban CPU browser).
2. **Plausible Analytics:**
   - Jika Anda memiliki akun Plausible, script telah didukung di Content Security Policy (`next.config.ts`).

---

## Langkah 9: Jadwal Pemantauan Mingguan

Catat metrik berikut setiap minggu (15 menit setiap Senin):

| Hari | Metrik yang Dipantau | Lokasi di GSC | Target Sehat |
|---|---|---|---|
| **Senin** | Impresi & Klik Pencarian Organik | GSC $\rightarrow$ Performa $\rightarrow$ Hasil Penelusuran | Grafik meningkat stabil |
| **Senin** | Impresi Tab "Video" | GSC $\rightarrow$ Performa $\rightarrow$ Filter: Video | Cuplikan video muncul di hasil Google |
| **Rabu** | Status Validasi Perbaikan | GSC $\rightarrow$ Pengindeksan $\rightarrow$ Halaman | Status validasi "Lulus" (*Passed*) |
| **Rabu** | Rasio Halaman Terindeks | GSC $\rightarrow$ Terindeks vs Tidak Terindeks | Angka terindeks naik dari 2,47 rb |
| **Jumat** | Kueri Penelusuran Populer | GSC $\rightarrow$ Kueri | Temukan tren kata kunci baru |
| **Jumat** | Status AI Enrichment | VPS CLI: `npm run seo:report` | Jumlah `enriched` bertambah setiap minggu |

---

## Langkah 10: 3 Strategi Promosi Alternatif di Luar Google Search

1. **Klip Pendek di X (Twitter) & Subreddit NSFW:**
   - Ekstrak klip preview 5–10 detik dari video terpopuler.
   - Posting klip tersebut di komunitas Reddit (r/NSFW_GIF, dll.) atau X dengan watermark LustHub dan tautan ke halaman tonton.
2. **Jaringan Pertukaran Banner / Tautan Silang (Traffic Trade):**
   - Pasang pertukaran banner atau tautan partner di footer dengan sesama webmaster situs video dewasa untuk saling bertukar backlink dofollow bertema relevan.
3. **Komunitas Mandiri (Discord / Lemmy NSFW):**
   - Bagikan koleksi video mingguan terkurasi (*Top 10 Video Minggu Ini*) untuk membangun basis pengunjung setia yang datang langsung (*direct traffic*) tanpa tergantung algoritma Google.
