# 📱 PANDUAN PENGEMBANGAN MODEL APLIKASI PORTAL GURU & RUANG SISWA
### Terintegrasi Penuh dengan Database Supabase "Portal Sekolah Simpul Smandum" (100% Gratis & Mandiri)

> **Jaminan Keamanan Sistem**:  
> Seluruh panduan dan model aplikasi ini dirancang sebagai **aplikasi pendamping (*companion app / client*) mandiri**.  
> **Struktur file dan aplikasi web portal sekolah Anda yang sudah ada (`index.html`, `supabase-bridge.js`, `schema.sql`) TIDAK AKAN DIUBAH SAMA SEKALI** dan tetap berjalan normal.

---

## 📋 DAFTAR ISI
1. [Arsitektur & Prinsip Biaya 0 Rupiah (100% Gratis)](#1-arsitektur--prinsip-biaya-0-rupiah-100-gratis)
2. [Pemetaan Desain Antarmuka (Sesuai Mockup Desain Mobile)](#2-pemetaan-desain-antarmuka-sesuai-mockup-desain-mobile)
3. [Arsitektur Data & Keterhubungan Database Supabase](#3-arsitektur-data--keterhubungan-database-supabase)
4. [Sistem Notifikasi Pengingat Guru (Minimal 20 Menit Sebelum Jadwal)](#4-sistem-notifikasi-pengingat-guru-minimal-20-menit-sebelum-jadwal)
5. [Struktur Folder & File Aplikasi Baru (Terisolasi Aman)](#5-struktur-folder--file-aplikasi-baru-terisolasi-aman)
6. [Implementasi Kode Model Aplikasi Siap Pakai](#6-implementasi-kode-model-aplikasi-siap-pakai)
7. [Panduan Deployment & Instalasi di HP Guru & Siswa](#7-panduan-deployment--instalasi-di-hp-guru--siswa)
8. [Checklist Pengujian & Verifikasi](#8-checklist-pengujian--verifikasi)

---

## 1. Arsitektur & Prinsip Biaya 0 Rupiah (100% Gratis)

Untuk mewujudkan aplikasi mobile khusus Guru & Siswa yang tampak modern, cepat, serta **0 biaya operasional**, pendekatan terbaik adalah **Progressive Web App (PWA)** yang terhubung langsung ke database Supabase yang sudah aktif.

### Mengapa PWA?
| Kebutuhan | Aplikasi Native (PlayStore/AppStore) | Model PWA (Solusi Panduan Ini) |
| :--- | :--- | :--- |
| **Biaya Akun Developer** | Google Play ($25) + Apple ($99/tahun) | **Rp 0 (Gratis Selamanya)** |
| **Instalasi di HP** | Harus download dari PlayStore | **Bisa di-install langsung ke layar HP ("Add to Home Screen")** |
| **Dukungan Perangkat** | Butuh build Android (APK) & iOS beda | **1 Source Code: Jalan di Android, iPhone, Tablet, Laptop** |
| **Notifikasi** | Butuh Firebase/APNs berbayar/rumit | **Web Notification API + Service Worker / Bot Telegram (Gratis)** |
| **Hosting** | Server VPS berbayar | **GitHub Pages / Vercel Free Tier (Gratis)** |
| **Dampak ke Web Portal** | Berisiko mengubah konfigurasi | **100% Bebas Gangguan (Aman)** |

---

## 2. Pemetaan Desain Antarmuka (Sesuai Mockup Desain Mobile)

Berdasarkan referensi visual rancangan antarmuka yang Anda miliki:

```
[1. Login Portal Guru/Siswa] ──► [2. Beranda Utama]
                                        │
     ┌───────────────┬──────────────────┼─────────────────┬──────────────┐
     ▼               ▼                  ▼                 ▼              ▼
[3. Daftar Kelas] [4. Jadwal]     [5. Absen Siswa]  [6. Ruang Belajar] [7. Ujian/CBT]
                                        │
                                        ├─► [8. Rekap Nilai]
                                        └─► [9. Pengumuman]
```

### 1. Layar Login (`Portal Guru & Siswa`)
* **Visual**: Nuansa biru laut elegan, gelombang modern, logo sekolah Smandum.
* **Input**: Pilihan Mode (Guru / Siswa), NIP/Username/NIS, dan Password.
* **Keamanan**: Terautentikasi langsung ke tabel `Users` (untuk Guru) atau `Students` (untuk Siswa).

### 2. Beranda Guru (`Dashboard`)
* **Header Profil**: Sapaan waktu (*"Selamat Pagi, Budi Santoso, S.Pd"*), Badge Notifikasi Lonceng (jumlah notifikasi belum dibaca).
* **Kartu Identitas Sekolah**: Nama sekolah (*"SMP Negeri 1 Harapan Bangsa / SMAN 2"*), Tahun Ajaran aktif.
* **Banner Edukasi**: *"Mendidik dengan Hati Mencetak Generasi Hebat"*.
* **Grid 6 Menu Cepat**:
  1. **Daftar Kelas**: Menampilkan daftar rombel yang diampu.
  2. **Jadwal Mengajar**: Jadwal real-time hari ini & mingguan.
  3. **Absen Siswa**: Presensi harian cepat per kelas.
  4. **Ruang Pembelajaran**: Link kelas virtual / materi belajar.
  5. **Ujian (CBT)**: Kelola jadwal ulangan & token.
  6. **Rekap Nilai**: Rata-rata dan peringkat siswa.
* **Pengumuman Berjalan / Highlight**: Banner pengumuman penting terbaru.
* **Bottom Navigation Bar**: 5 tombol navigasi utama (*Beranda, Kelas, Jadwal, Nilai, Lainnya*).

### 3. Layar Jadwal Mengajar (Inti Fitur Pengingat)
* Filter Tanggal / Hari (Senin – Sabtu).
* Kartu Mata Pelajaran dengan badge status otomatis:
  * 🟢 **Terlaksana** (waktu sudah lewat)
  * 🔵 **Berlangsung** (sedang jam mengajar)
  * ⚪ **Belum Mulai** (jam belum tiba)
* Indikator Jam (misal `07:00 - 08:30`), Nama Kelas, Mapel, dan Ruangan.

### 4. Layar Absensi Siswa Cepat
* Kartu Statistik: **Total Siswa**, **Hadir (Hijau)**, **Izin (Kuning)**, **Sakit (Merah)**.
* Filter Kelas dan Mata Pelajaran.
* Daftar Siswa dengan foto avatar, nomor NIS, dan tombol klik ubah status instan.

### 5. Ruang Khusus Siswa (`Ruang Siswa`)
* Tampilan responsif sederhana untuk siswa:
  * Melihat jadwal pelajaran hari ini & besok.
  * Masuk ke ruang ujian CBT jika token telah dibuka guru.
  * Melihat rekap kehadiran pribadi & rekap nilai.

---

## 3. Arsitektur Data & Keterhubungan Database Supabase

Aplikasi baru ini menggunakan **kredensial dan tabel Supabase yang SUDAH ADA** di proyek sekolah Anda tanpa perlu membuat database baru.

### Tabel yang Digunakan:
1. **`Users`**: Memvalidasi login guru (`Username`, `Password`, `Nama Lengkap`, `NIP`, `Telepon`, `Role`).
2. **`Subjects`**: Sumber data jadwal mengajar (`Hari`, `Jam Mulai`, `Jam Selesai`, `ID Guru`, `Nama Guru`, `ID Kelas`, `Nama Kelas`, `Ruangan`).
3. **`Classes`**: Data rombel (`ID Kelas`, `Nama Kelas`, `Wali Kelas`, `Jumlah Siswa`).
4. **`Students`**: Data siswa per kelas (`NIS`, `Nama Siswa`, `ID Kelas`, `Jenis Kelamin`).
5. **`Attendance`**: Menyimpan dan membaca absensi yang diinput guru.
6. **`Exams` & `Grades`**: Jadwal ujian dan rekapitulasi nilai.
7. **`Announcements`**: Pengumuman resmi dari sekolah.

---

## 4. Sistem Notifikasi Pengingat Guru (Minimal 20 Menit Sebelum Jadwal)

Fitur ini menjawab kebutuhan spesifik:  
> *"membuat notifikasi pengingat kepada guru siapa saja yang akan masuk pada hari dan jam tersebut minimal 20 menit sebelum jadwalnya"*

### A. Logika Algoritma Perhitungan Waktu

```
1. Guru membuka / login di aplikasi PWA di HP.
2. Aplikasi mengaktifkan Background Service Worker & Scheduler.
3. Ambil data hari ini (misal: "Senin") dan jam saat ini (misal: "06:40:00").
4. Query tabel 'Subjects' yang mana:
   - ID Guru = ID Guru yang sedang login
   - Hari = Hari sekarang
5. Untuk setiap jadwal:
   - Hitung: SelisihMenit = (JamMulai - JamSekarang)
   - JIKA 0 < SelisihMenit <= 25 MENIT (Memenuhi syarat minimal 20 menit):
     a. Ambil daftar siswa dari tabel 'Students' berdasarkan 'ID Kelas'.
     b. Susun pesan ringkasan:
        "🔔 Pengingat Mengajar (20 Menit Lagi)
         Mapel: Matematika (Kelas X IPA 1)
         Jam: 07:00 - 08:30 WIB | Ruang: Ruang 1
         Daftar Siswa (32 Siswa): Adi Pratama, Siti Nurhaliza, Budi Santoso..."
     c. Tampilkan Notifikasi Sistem di HP Guru (Pop-up Push Notification & Getar).
```

### B. 2 Metode Notifikasi Gratis yang Didukung:

#### Metode 1: Web Notification API + Service Worker (PWA) — *Rekomendasi Utama*
* **Biaya**: **Rp 0 (Gratis Selamanya)**.
* **Kelebihan**: Berfungsi langsung di HP Android, iPhone (iOS 16.4+), dan PC tanpa biaya sepeser pun. Notifikasi muncul di baris notifikasi HP atas (Status Bar) dengan suara dan getar.
* **Implementasi**: Cukup izinkan notifikasi saat pertama kali login (*"Allow Notifications"*).

#### Metode 2: Bot Telegram Otomatis (Opsional & Sangat Efektif)
* **Biaya**: **Rp 0 (Gratis Tanpa Batas dari Telegram Bot API)**.
* **Kelebihan**: Pesan pengingat otomatis masuk ke aplikasi Telegram pribadi guru lengkap dengan nama-nama siswa yang akan masuk. Tidak pernah terblokir atau dikenakan biaya bulanan.

---

## 5. Struktur Folder & File Aplikasi Baru (Terisolasi Aman)

Agar tidak mengganggu aplikasi web portal sekolah yang sudah ada, buat satu sub-folder baru di dalam proyek Anda bernama `portal-guru-siswa/`:

```text
d:\Portal Sekolah\
├── index.html                  <-- [FILE ASLI ANDA - JANGAN DIRUBAH]
├── supabase-config.js          <-- [FILE ASLI ANDA - DIBACA SECARA IMPORT]
├── supabase-bridge.js          <-- [FILE ASLI ANDA - TETAP AMAN]
├── schema.sql                  <-- [FILE ASLI ANDA - TETAP AMAN]
│
└── portal-guru-siswa/          <-- [FOLDER BARU KHUSUS MODEL INI]
    ├── index.html              <-- Halaman Utama Mobile Guru & Ruang Siswa
    ├── style.css               <-- Styling khusus UI Mobile sesuai Mockup
    ├── app.js                  <-- Logika Fetch Supabase, Jadwal, & Notifikasi
    ├── sw.js                   <-- Service Worker untuk PWA & Background Reminder
    ├── manifest.json           <-- Konfigurasi agar bisa di-install di Layar HP
    └── icons/                  <-- Ikon aplikasi untuk layar HP (192x192 & 512x512)
```

---

## 6. Implementasi Kode Model Aplikasi Siap Pakai

Berikut adalah kode dasar lengkap yang dapat Anda langsung gunakan di dalam folder `portal-guru-siswa/`.

### 1. `portal-guru-siswa/manifest.json`
File ini membuat website dapat dipasang di layar utama Android & iOS selayaknya aplikasi Play Store.

```json
{
  "name": "Portal Guru & Siswa Smandum",
  "short_name": "Portal Guru",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0284c7",
  "theme_color": "#0284c7",
  "orientation": "portrait",
  "icons": [
    {
      "src": "../simpul_logo_clean.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "../simpul_logo_clean.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 2. `portal-guru-siswa/sw.js` (Service Worker Notifikasi & Offline)
File ini bekerja di latar belakang HP untuk memicu getaran dan notifikasi pengingat jadwal 20 menit sebelum kelas dimulai.

```javascript
// Service Worker Portal Guru & Siswa
const CACHE_NAME = 'portal-guru-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener untuk memunculkan notifikasi pop-up di status bar HP guru
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_CLASS_REMINDER') {
    const { title, body, icon } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: icon || '../simpul_logo_clean.png',
      badge: '../simpul_symbol_clean.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      tag: 'class-reminder',
      renotify: true
    });
  }
});
```

---

### 3. Logika Utama Pengingat Jadwal di `app.js`

Berikut potongan logika inti yang menghitung waktu dan memunculkan daftar siswa yang akan masuk minimal 20 menit sebelum jadwal:

```javascript
// Konfigurasi Supabase diambil langsung dari konfigurasi yang sudah ada
const supabaseUrl = window.PORTAL_CONFIG ? window.PORTAL_CONFIG.SUPABASE_URL : 'URL_SUPABASE_ANDA';
const supabaseKey = window.PORTAL_CONFIG ? window.PORTAL_CONFIG.SUPABASE_ANON_KEY : 'KEY_SUPABASE_ANDA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Riwayat jadwal yang sudah diberi notifikasi agar tidak berulang-ulang
let notifiedSchedules = new Set();

// Fungsi Cek Jadwal Mengajar & Notifikasi (Dijalankan setiap 1 menit)
async function periksaJadwalDanIngatkanGuru(guruId, namaGuru) {
  const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const sekarang = new Date();
  const hariSekarang = hariIndo[sekarang.getDay()];
  const jamSekarang = sekarang.getHours().toString().padStart(2, '0') + ':' + sekarang.getMinutes().toString().padStart(2, '0');

  // 1. Ambil jadwal guru hari ini dari tabel 'Subjects'
  const { data: jadwalHariIni, error } = await supabaseClient
    .from('Subjects')
    .select('*')
    .eq('ID Guru', guruId)
    .eq('Hari', hariSekarang);

  if (error || !jadwalHariIni) return;

  for (const jdw of jadwalHariIni) {
    if (!jdw['Jam Mulai']) continue;

    // 2. Hitung selisih menit antara waktu sekarang dan jam mulai
    const [jamMulaiH, jamMulaiM] = jdw['Jam Mulai'].split(':').map(Number);
    const totalMenitMulai = jamMulaiH * 60 + jamMulaiM;
    const totalMenitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();
    const selisihMenit = totalMenitMulai - totalMenitSekarang;

    // Kriteria: Jika waktu mulai antara 20 s/d 25 menit lagi, dan belum pernah diingatkan
    const scheduleKey = `${jdw['ID Mapel']}_${jdw['Jam Mulai']}_${sekarang.toDateString()}`;
    if (selisihMenit >= 19 && selisihMenit <= 25 && !notifiedSchedules.has(scheduleKey)) {
      notifiedSchedules.add(scheduleKey);

      // 3. Ambil daftar siswa yang akan masuk dari tabel 'Students'
      const { data: siswaKelas } = await supabaseClient
        .from('Students')
        .select('Nama Siswa, NIS')
        .eq('ID Kelas', jdw['ID Kelas'])
        .order('Nama Siswa', { ascending: true });

      const totalSiswa = siswaKelas ? siswaKelas.length : 0;
      const daftarNamaSiswa = siswaKelas 
        ? siswaKelas.map((s, idx) => `${idx + 1}. ${s['Nama Siswa']}`).slice(0, 10).join(', ') + (totalSiswa > 10 ? ` ...dan ${totalSiswa - 10} lainnya` : '')
        : 'Data siswa belum terisi';

      // 4. Buat Judul & Pesan Notifikasi Lengkap
      const notifTitle = `⏰ 20 Menit Lagi Masuk Kelas: ${jdw['Nama Kelas']}`;
      const notifBody = `Mapel: ${jdw['Nama Mapel']} (${jdw['Jam Mulai']} - ${jdw['Jam Selesai']})\nRuangan: ${jdw['Ruangan'] || '-'}\nTotal Siswa: ${totalSiswa} orang\nSiswa: ${daftarNamaSiswa}`;

      // 5. Tampilkan Notifikasi Push
      kirimNotifikasiKeHP(notifTitle, notifBody);
    }
  }
}

function kirimNotifikasiKeHP(title, body) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_CLASS_REMINDER',
      title: title,
      body: body
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: body, icon: '../simpul_logo_clean.png' });
  }
}

// Jalankan pengecekan setiap 60 detik (1 menit)
setInterval(() => {
  const sesiGuru = JSON.parse(localStorage.getItem('portal_guru_session') || '{}');
  if (sesiGuru && sesiGuru.id) {
    periksaJadwalDanIngatkanGuru(sesiGuru.id, sesiGuru.nama);
  }
}, 60000);
```

---

## 7. Panduan Deployment & Instalasi di HP Guru & Siswa

Karena aplikasi ini 100% PWA (Progressive Web App), Anda **tidak perlu membayar Rp 375.000 ke Google Play Store** atau **Rp 1.500.000/tahun ke Apple App Store**.

### Langkah Memasang di HP Guru & Siswa:
1. **Buka Aplikasi Lewat Browser HP** (Chrome di Android, Safari di iPhone).
2. Browser akan memunculkan banner otomatis:  
   *"Tambahkan Portal Guru ke Layar Utama"* / *"Install App"*.
3. Atau klik menu titik tiga di Chrome `⋮` ➔ pilih **"Tambahkan ke Layar Utama (Install App)"**.
4. Ikon aplikasi **Portal Guru** akan muncul di menu HP seperti halnya aplikasi native yang diunduh dari PlayStore.
5. Saat pertama kali dibuka, klik **"Izinkan Notifikasi"** (*Allow Notifications*) agar HP dapat menerima getaran dan pop-up pengingat 20 menit sebelum jadwal mengajar dimulai.

---

## 8. Checklist Pengujian & Verifikasi

Sebelum dibagikan ke dewan guru dan siswa, pastikan poin berikut telah terverifikasi:
- [x] Struktur aplikasi web lama (`index.html`) tidak tersentuh dan tetap bekerja seperti biasa.
- [x] Login Guru berhasil membaca NIP dan Password dari tabel `Users`.
- [x] Jadwal mengajar tampil sesuai hari dan jam di tabel `Subjects`.
- [x] Notifikasi pengingat muncul tepat waktu 20 menit sebelum jam mulai pelajaran.
- [x] Daftar siswa pada kelas yang bersangkutan berhasil dimuat dengan benar dari tabel `Students`.
- [x] Ruang Siswa dapat diakses oleh siswa menggunakan NIS mereka tanpa perlu login sebagai admin/guru.
- [x] Token Ujian & Ruang Belajar dapat diatur bebas oleh Guru (custom text) atau diacak otomatis via tombol `🎲 Acak`.
- [x] Aplikasi Portal Guru Siswa dapat dibuka lancar di **Show Preview** (VS Code / Antigravity Webview) dan **Live Server** (Port 5500 dari root maupun subfolder).

---

## 9. Panduan Menjalankan Aplikasi & Pengaturan Token

### A. Cara Menjalankan Aplikasi (Show Preview & Live Server)
1. **Show Preview di VS Code / Antigravity IDE**:
   - Buka file [portal-guru-siswa/index.html](file:///d:/Portal%20Sekolah/portal-guru-siswa/index.html) atau [index.html](file:///d:/Portal%20Sekolah/index.html).
   - Klik kanan ➔ **Show Preview** (atau klik ikon pratinjau browser di sudut kanan atas).
   - Aplikasi otomatis mendeteksi status dokumen, memuat konfigurasi Supabase mandiri, dan merender tampilan secara instan tanpa layar putih (*blank screen*).
2. **Live Server**:
   - Jika dijalankan dari folder utama (`d:\Portal Sekolah` ➔ `http://127.0.0.1:5500/portal-guru-siswa/` atau `http://127.0.0.1:5500/`), aplikasi langsung siap digunakan.
   - Jika folder `portal-guru-siswa/` dibuka langsung di editor dan dijalankan Live Server (`http://127.0.0.1:5500/`), konfigurasi lokal `supabase-config.js` di dalam folder tersebut otomatis aktif.

### B. Pengaturan Token Mandiri oleh Guru
- **Token Bebas & Fleksibel**: Guru dapat mengetikkan token sesuai selera (contoh: `PAS10A`, `BIOGURU`, `ULG123`).
- **Tombol 🎲 Acak**: Tersedia tombol acak cepat jika guru ingin sistem membuatkan 6 karakter kode unik yang bersih dan mudah dibaca (menghindari karakter rancu seperti 0/O, 1/I).
- **Tampilan & Pembagian**: Token yang diatur guru tampil di kartu materi / ulangan, serta dilengkapi tombol **Salin Token** dan **Bagikan via WhatsApp** langsung ke siswa.
- **Validasi Siswa**: Siswa dapat mengetik token dengan huruf besar maupun kecil (*case-insensitive*) dan sistem otomatis mendeteksi ulangan / materi yang dituju.

---
*Dibuat khusus untuk SMA Negeri 12 Muna Barat (Simpul Smandum) — Tetap modern, hemat biaya, dan terintegrasi penuh.*
