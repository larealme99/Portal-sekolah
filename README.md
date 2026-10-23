# 🏫 Portal Sekolah (Standalone Web App + Supabase)

Aplikasi Portal Akademik, Manajemen Pembelajaran, Absensi Siswa, dan Ujian CBT Online dengan deteksi anti-curang.

Aplikasi ini telah dimigrasikan secara penuh dari **Google Apps Script** ke **Arsitektur Standalone Modern** berbasis **Supabase (PostgreSQL)**, sehingga dapat di-hosting secara gratis di GitHub Pages, Vercel, maupun Netlify.

---

## 🌟 Fitur Utama
1. **Multi-Role User**: Administrator dan Guru (Registrasi, Approval, Kelola Hak Akses).
2. **Manajemen Akademik**:
   - Data Kelas & Siswa
   - Jadwal & Mata Pelajaran
   - Absensi Siswa (Harian, Rekap, Cetak Laporan)
3. **Ujian Online CBT & Anti-Curang**:
   - Bank Soal (Pilihan Ganda & Essay)
   - Token Ujian Otomatis & Fleksibel
   - Deteksi Pindah Tab / Pindah Aplikasi / Layar Hilang
   - Rekap Nilai Otomatis & Koreksi Guru
4. **Pusat Informasi & Pengaturan**:
   - Pengumuman Sekolah dengan Prioritas
   - Kustomisasi Identitas Sekolah & Galeri Foto

---

## 📂 Struktur File

| File | Keterangan |
| :--- | :--- |
| `index.html` | Aplikasi Web Utama (Frontend SPA) |
| `supabase-config.js` | Tempat memasukkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` |
| `supabase-bridge.js` | Jembatan pengganti Google Apps Script yang menghubungkan UI ke Supabase |
| `schema.sql` | Skrip SQL lengkap untuk membuat 13 tabel dan data awal di Supabase |
| `PANDUAN_MIGRASI.md` | Panduan lengkap langkah demi langkah setup Supabase & GitHub |
| `_archive_gas/` | Arsip kode lama Google Apps Script (`Code.gs`, `setupDatabase.gs`) |

---

## 🚀 Cara Menjalankan Aplikasi

1. **Jalankan Skrip SQL di Supabase**:
   - Buka project Supabase Anda di [supabase.com](https://supabase.com).
   - Masuk ke menu **SQL Editor**, buka file `schema.sql`, lalu klik **Run**.
2. **Atur Kredensial di `supabase-config.js`**:
   - Buka `supabase-config.js`, masukkan Project URL dan Anon Key dari Supabase.
3. **Buka Aplikasi**:
   - Cukup buka file `index.html` di browser Anda atau gunakan Live Server / Hosting GitHub Pages.
   - Login admin default:
     - **Username**: `admin`
     - **Password**: `admin123`

---

## 📜 Lisensi
Dikembangkan untuk kebutuhan digitalisasi manajemen sekolah. Hak cipta dilindungi.
