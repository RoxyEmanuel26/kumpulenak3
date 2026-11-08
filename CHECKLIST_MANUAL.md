# Panduan Tindakan Manual Pemilik Situs (Operator Checklist)
**Dokumen:** `CHECKLIST_MANUAL.md`  
**Target Domain:** `https://www.lusthub.web.id`  
**Proyek:** LustHub SEO Overhaul  
**Versi:** 1.0 (Pasca Implementasi Fase 0–6)

---

> [!IMPORTANT]
> Dokumen ini berisi instruksi operasional yang **tidak dapat diselesaikan secara otomatis oleh AI/coding agent** karena membutuhkan akses langsung ke panel kontrol eksternal (DNS registrar, Google Search Console, Bing Webmaster Tools, dan panel analitik pihak ketiga).
> 
> Ikuti langkah-langkah di bawah ini secara berurutan untuk memaksimalkan efektivitas hasil optimasi teknis yang telah diimplementasikan di kode.

---

## Daftar Isi
1. [Langkah 1: Verifikasi Google Search Console & Submit Sitemap Index](#langkah-1-verifikasi-google-search-console--submit-sitemap-index)
2. [Langkah 2: Pemantauan Indeksasi Halaman & Video di GSC](#langkah-2-pemantauan-indeksasi-halaman--video-di-gsc)
3. [Langkah 3: Permintaan Indeksasi Manual (URL Inspection Tool)](#langkah-3-permintaan-indeksasi-manual-url-inspection-tool)
4. [Langkah 4: Bing Webmaster Tools & Implementasi IndexNow](#langkah-4-bing-webmaster-tools--implementasi-indexnow)
5. [Langkah 5: Konfigurasi Analitik Privasi (Plausible / Cloudflare Web Analytics)](#langkah-5-konfigurasi-analitik-privasi-plausible--cloudflare-web-analytics)
6. [Langkah 6: Jadwal & Metrik Pemantauan Mingguan](#langkah-6-jadwal--metrik-pemantauan-mingguan)
7. [Langkah 7: 3 Strategi Promosi Alternatif di Luar Google Search](#langkah-7-3-strategi-promosi-alternatif-di-luar-google-search)

---

## Langkah 1: Verifikasi Google Search Console & Submit Sitemap Index

Google Search Console (GSC) adalah saluran komunikasi resmi Google untuk melaporkan status perayapan (*crawling*), pengindeksan (*indexing*), dan masalah keamanan situs Anda.

### A. Verifikasi Domain di GSC (Metode Rekomendasi: DNS TXT)
1. Buka [Google Search Console](https://search.google.com/search-console).
2. Login menggunakan akun Google pengelola situs.
3. Di panel kiri atas, klik menu drop-down properti lalu pilih **+ Add property** (Tambahkan properti).
4. Pilih opsi **Domain** (bukan *URL prefix*):
   - Masukkan nama domain: `lusthub.web.id`.
   - Google akan memberikan sebuah kode **TXT Record**, contoh: `google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`.
5. Buka dashboard DNS domain Anda (misalnya Cloudflare DNS atau cPanel registrar):
   - Tambahkan record baru:
     - **Type:** `TXT`
     - **Name / Host:** `@` (atau `lusthub.web.id`)
     - **Content / Value:** Kode verifikasi dari Google di atas
     - **TTL:** Auto (atau 5 menit)
6. Kembali ke Google Search Console dan klik tombol **Verify** (Verifikasi).

### B. Submit Sitemap Index
Setelah domain terverifikasi:
1. Di sidebar kiri GSC, klik menu **Indexing > Sitemaps** (Peta Situs).
2. Di kolom *Add a new sitemap* (Tambahkan peta situs baru), ketik:
   ```text
   sitemap.xml
   ```
3. Klik **Submit**.
4. Status harus menunjukkan **Success** (Sukses).
5. Googlebot akan secara otomatis membaca sitemap index ini dan mengantrekan segmen-segmen di dalamnya:
   - `https://www.lusthub.web.id/sitemap/0.xml` (Rute statis, legal, dan 16 kategori Tier-1)
   - `https://www.lusthub.web.id/sitemap/1.xml` (URL video dengan standar Google Video Sitemap extension)

---

## Langkah 2: Pemantauan Indeksasi Halaman & Video di GSC

Situs video streaming memiliki dua laporan indeksasi terpisah di Google Search Console yang wajib dipantau: **Pages** dan **Video pages**.

### A. Laporan "Pages" (Semua Halaman Situs)
1. Buka menu **Indexing > Pages** di sidebar GSC.
2. Periksa status:
   - **Indexed (Terindeks):** Halaman yang sudah siap muncul di hasil pencarian.
   - **Not indexed (Tidak terindeks):** Halaman yang belum masuk indeks.
3. **Penyebab umum dan cara menyikapinya pasca overhaul SEO:**
   - *Crawled - currently not indexed:* Sering terjadi pada situs video baru atau halaman video tipis. Solusinya: jalankan background enricher `npm run seo:enrich` untuk mengisi sinopsis AI dan FAQ unik.
   - *Discovered - currently not indexed:* Google sudah menemukan URL tetapi antrean perayapan penuh karena domain authority masih baru. Tunggu beberapa hari seiring bertambahnya perayapan.
   - *Excluded by ‘noindex’ tag:* Ini **normal dan sengaja** diterapkan pada halaman hasil pencarian internal (`/results`) dan library (`/library`) untuk menghemat crawl budget.

### B. Laporan "Video pages" (Halaman Video Khusus)
1. Buka menu **Indexing > Video pages**.
2. Pastikan Google mengenali metadata video:
   - Indikator keberhasilan: Status *Video indexed*.
   - Jika muncul peringatan *No video embed URL found* atau *Missing thumbnail URL*: Format sitemap LustHub telah dilengkapi `<video:player_loc>` dan `<video:thumbnail_loc>` serta JSON-LD `VideoObject` yang valid. Verifikasi ulang melalui menu URL Inspection.

---

## Langkah 3: Permintaan Indeksasi Manual (URL Inspection Tool)

Untuk mempercepat Google meng-crawl halaman-halaman prioritas (Tier-1 hub) tanpa menunggu siklus bot bulanan:

1. Di kotak pencarian paling atas GSC ("Inspect any URL in 'lusthub.web.id'"), tempelkan URL berikut satu per satu:
   - `https://www.lusthub.web.id/`
   - `https://www.lusthub.web.id/categories`
   - `https://www.lusthub.web.id/category/indonesia`
   - `https://www.lusthub.web.id/category/japanese`
   - `https://www.lusthub.web.id/category/milf`
   - `https://www.lusthub.web.id/category/asian`
2. Klik tombol **Test Live URL** (Uji URL Langsung) untuk memastikan Googlebot bisa merender HTML dengan status 200 OK dan mendeteksi schema JSON-LD.
3. Setelah tes berhasil, klik tombol **Request Indexing** (Minta Pengindeksan).
4. *Catatan kuota:* Google membatasi permintaan indexing sekitar 10–20 URL per hari per properti. Gunakan hanya untuk halaman kategori dan beranda, jangan untuk ribuan video sekaligus.

---

## Langkah 4: Bing Webmaster Tools & Implementasi IndexNow

Mesin pencari Bing (dan DuckDuckGo yang menggunakan indeks Bing) memiliki pangsa pasar signifikan untuk kueri hiburan dewasa dan jauh lebih ramah terhadap pengindeksan instan melalui protokol **IndexNow**.

### A. Pendaftaran Bing Webmaster Tools
1. Buka [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Login dengan akun Microsoft / Google.
3. Anda bisa mengimpor properti secara instan langsung dari Google Search Console yang telah diverifikasi sebelumnya (hanya 1 klik).
4. Masuk ke menu **Sitemaps**, masukkan `https://www.lusthub.web.id/sitemap.xml` dan klik Submit.

### B. Protokol IndexNow (Pengindeksan Seketika)
IndexNow memberi tahu Bing, Yandex, Seznam, dan Naver seketika saat ada video baru diunggah tanpa menunggu bot merayapi sitemap:
1. Generate IndexNow Key (string acak heksadesimal 32 karakter, misal: `9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d`).
2. Buat file verifikasi statis di folder `public/{key}.txt` yang berisi string key tersebut.
3. Saat cron sinkronisasi video (`/api/cron/sync`) menambahkan batch video baru, kirim HTTP POST ke `https://api.indexnow.org/indexnow`:
   ```json
   {
     "host": "www.lusthub.web.id",
     "key": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
     "keyLocation": "https://www.lusthub.web.id/9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d.txt",
     "urlList": [
       "https://www.lusthub.web.id/watch/judul-video-slug-abc123xyz"
     ]
   }
   ```

---

## Langkah 5: Konfigurasi Analitik Privasi (Plausible / Cloudflare Web Analytics)

Sesuai aturan arsitektur LustHub (tanpa pelacakan pengguna invasif & performa Core Web Vitals tinggi), disarankan menggunakan analitik berbasis privasi tanpa cookie pihak ketiga.

### Opsi 1: Cloudflare Web Analytics (Rekomendasi Utama - Ringan & Gratis)
1. Masuk ke dashboard Cloudflare untuk zona `lusthub.web.id`.
2. Di menu kiri, pilih **Analytics & Logs > Web Analytics**.
3. Jika domain diproksi melalui Cloudflare (orange-cloud), Anda cukup mengaktifkan toggle **Automatic JS Injection**.
4. Tidak perlu menambahkan script tag manual ke codebase, dan tidak menambah beban waktu render browser.

### Opsi 2: Plausible Analytics (Self-Hosted atau Cloud)
Jika menggunakan Plausible:
1. Daftarkan domain `lusthub.web.id` di panel Plausible Anda.
2. Tambahkan script async ringan (< 1 KB) di `app/layout.tsx` menggunakan `next/script` dengan `strategy="afterInteractive"`.
3. Script Plausible tidak menggunakan cookie, tidak melanggar GDPR/ePrivacy, dan tidak diblokir oleh AdBlocker umum jika di-proxy lewat domain sendiri.

---

## Langkah 6: Jadwal & Metrik Pemantauan Mingguan

Luangkan waktu 15–20 menit setiap minggu (misal hari Senin pagi) untuk mencatat tren kinerja situs di spreadsheet:

| Hari / Siklus | Metrik yang Diperiksa | Alat | Target & Batas Normal |
|---|---|---|---|
| **Senin** | Total Impresi & Klik Pencarian Organik | GSC > Performance (Search Results) | Tren grafik naik minggu-ke-minggu |
| **Senin** | Impresi Tab "Video" | GSC > Performance > Search type: Video | Memastikan cuplikan video muncul di hasil pencarian |
| **Rabu** | Total Halaman Terindeks | GSC > Indexing > Pages | Rasio terindeks meningkat, halaman error 5xx = 0 |
| **Rabu** | Video Terindeks | GSC > Indexing > Video pages | Bertambah seiring background enrichment berjalan |
| **Jumat** | Kueri Penelusuran Populer (*Queries*) | GSC > Performance > Queries | Cari kata kunci baru untuk dibuatkan halaman kategori Tier-2 |
| **Jumat** | Status Background Enrichment | Server CLI: `npm run seo:report` | Monitor rasio konten `enriched` vs `pending` |

---

## Langkah 7: 3 Strategi Promosi Alternatif di Luar Google Search

Google Search menerapkan filter *SafeSearch* ketat untuk kueri eksplisit, sehingga mendiversifikasi sumber traffic di luar Google adalah strategi wajib untuk situs hiburan dewasa:

### 1. Kurasi Klip Pendek di X (Twitter) & Reddit (Community Traffic)
- **Mekanisme:** Buat akun resmi di platform ramah konten NSFW (X/Twitter dan subreddit bertema spesifik seperti r/NSFW_GIF, r/porn_gifs, dll.).
- **Taktik Konten:** Ekstrak klip preview 5–10 detik (looping MP4/GIF berkualitas tinggi) dari video terpopuler.
- **Tautan Balik (*Backlink*):** Cantumkan tautan langsung ke halaman watch situs Anda (`https://www.lusthub.web.id/watch/...`) di komentar pertama atau bio dengan call-to-action "Tonton Full HD di LustHub".
- **Dampak:** Menghasilkan ribuan klik langsung (*referral traffic*) sekaligus mengirimkan sinyal sosial (*social signals*) yang mempercepat Google mengenali popularitas halaman.

### 2. Jaringan Sindikasi Konten & Traffic Exchange (JuicyAds / ExoClick / EroAdvertising)
- **Mekanisme:** Manfaatkan jaringan pertukaran traffic (*traffic trade*) dan widget rekomendasi konten dewasa.
- **Taktik:** Pasang pertukaran tautan silang (*flat banner / text link exchange*) dengan webmaster situs partner sesama genre (misalnya tautan footer atau menu "Partner Links").
- **Dampak:** Memperoleh backlink dofollow bertema relevan dari domain bertrafik sejenis, yang merupakan faktor penentu utama peningkatan Domain Rating (DR) di Ahrefs/Semrush.

### 3. Saluran Pesan Pribadi & Komunitas Web (Discord / Matrix / Lemmy NSFW)
- **Mekanisme:** Bangun channel komunitas independen di mana bot otomatis (atau skrip RSS feed) memposting video terbaru yang baru saja diperkaya AI beserta sinopsis singkatnya.
- **Taktik:** Bagikan tautan ke koleksi kategori spesifik (misalnya *"Top 10 Video Kategori Japanese Minggu Ini"*).
- **Dampak:** Menciptakan audiens berulang (*returning visitors*) dengan retensi tinggi tanpa bergantung 100% pada algoritma mesin pencari.
