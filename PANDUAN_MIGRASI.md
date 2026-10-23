# 📖 Panduan Lengkap Migrasi ke Supabase & GitHub (100% Bebas Google Apps Script)

Dokumen ini memandu Anda menyelesaikan proses migrasi aplikasi **Portal Sekolah** agar berjalan penuh di cloud menggunakan **Supabase** dan tersimpan rapi di **GitHub Repository**.

---

## 📑 Daftar Isi
1. [Langkah 1: Membuat & Menyiapkan Database Supabase](#langkah-1-membuat--menyiapkan-database-supabase)
2. [Langkah 2: Menghubungkan Kredensial di `supabase-config.js`](#langkah-2-menghubungkan-kredensial-di-supabase-configjs)
3. [Langkah 3: Mengunggah Proyek ke GitHub Repository](#langkah-3-mengunggah-proyek-ke-github-repository)
4. [Langkah 4: Mengaktifkan Hosting Gratis (GitHub Pages / Vercel)](#langkah-4-mengaktifkan-hosting-gratis-github-pages--vercel)
5. [Verifikasi Akun & Uji Coba](#verifikasi-akun--uji-coba)

---

## Langkah 1: Membuat & Menyiapkan Database Supabase

1. Kunjungi **[supabase.com](https://supabase.com)** dan masuk dengan akun Anda (atau daftar gratis).
2. Klik tombol **New Project**:
   - **Name**: `portal-sekolah`
   - **Database Password**: Buat password yang kuat dan catat di tempat aman.
   - **Region**: Pilih **Singapore (`ap-southeast-1`)** (rekomendasi untuk latensi terendah di Indonesia).
   - Klik **Create new project** (tunggu ~1-2 menit hingga status berubah menjadi hijau / *Active*).
3. Buka menu **SQL Editor** (ikon terminal `>_` di sidebar kiri).
4. Klik **New Query**.
5. Buka file [`schema.sql`](schema.sql) yang sudah kami buat di folder ini, salin seluruh isinya, lalu tempel (*paste*) ke SQL Editor Supabase.
6. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
   > Database Supabase Anda kini telah memiliki 13 tabel lengkap, indeks pencarian cepat, aturan izin (RLS), akun administrator default, serta pengaturan sekolah awal.

---

## Langkah 2: Menghubungkan Kredensial di `supabase-config.js`

1. Di dashboard Supabase, klik menu **Project Settings** (ikon roda gigi di pojok kiri bawah) ➔ pilih submenu **API**.
2. Anda akan melihat dua informasi penting:
   - **Project URL** (contoh: `https://xyzabcdefghijkl.supabase.co`)
   - **Project API Keys** ➔ cari yang berlabel **`anon` `public`**.
3. Buka file [`supabase-config.js`](supabase-config.js) di komputer Anda menggunakan editor teks (VS Code / Notepad).
4. Masukkan kedua nilai tersebut:
   ```javascript
   window.PORTAL_CONFIG = {
     SUPABASE_URL: 'https://xyzabcdefghijkl.supabase.co', // Ganti dengan URL Anda
     SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...' // Ganti dengan Anon Key Anda
   };
   ```
5. Simpan file (`Ctrl + S`).

---

## Langkah 3: Mengunggah Proyek ke GitHub Repository

Buka Terminal / PowerShell di folder proyek ini (`d:\Portal Sekolah`), lalu jalankan perintah berikut:

### 1. Inisialisasi Git Lokal
```powershell
git init
git add .
git commit -m "feat: migrasi penuh ke standalone web app dengan supabase"
```

### 2. Buat Repositori Baru di GitHub
1. Buka browser, kunjungi **[github.com/new](https://github.com/new)**.
2. Isi **Repository name**: `portal-sekolah` (atau nama lain sesuai keinginan).
3. Pilih opsi **Public** (jika ingin gratis memakai GitHub Pages) atau **Private**.
4. **Jangan** centang opsi *Add a README file* (karena file sudah kita miliki secara lokal).
5. Klik **Create repository**.

### 3. Hubungkan dan Push ke GitHub
Salin dan jalankan perintah dari GitHub (ganti `USERNAME_GITHUB_ANDA` dengan username GitHub Anda):
```powershell
git branch -M main
git remote add origin https://github.com/USERNAME_GITHUB_ANDA/portal-sekolah.git
git push -u origin main
```

---

## Langkah 4: Mengaktifkan Hosting Gratis (GitHub Pages / Vercel)

Aplikasi Portal Sekolah Anda kini berupa **website statis murni** tanpa butuh server Node.js maupun Google Apps Script. Anda bisa memilih salah satu opsi hosting gratis berikut:

### Opsi A: Menggunakan GitHub Pages (Sangat Mudah)
1. Buka halaman repositori Anda di GitHub.
2. Klik tab **Settings** ➔ di sidebar kiri pilih menu **Pages**.
3. Pada bagian **Build and deployment**:
   - **Source**: Pilih `Deploy from a branch`
   - **Branch**: Pilih `main` dan folder `/ (root)`
4. Klik **Save**.
5. Tunggu sekitar 1 menit. GitHub akan menampilkan link website Anda, misalnya:
   `https://USERNAME_GITHUB_ANDA.github.io/portal-sekolah/`

### Opsi B: Menggunakan Vercel (Rekomendasi untuk Performa & Custom Domain)
1. Kunjungi **[vercel.com](https://vercel.com)** dan login menggunakan akun GitHub Anda.
2. Klik **Add New...** ➔ **Project**.
3. Pilih repositori `portal-sekolah` yang baru Anda buat, lalu klik **Import**.
4. Biarkan konfigurasi default, lalu klik **Deploy**.
5. Website Anda langsung online dalam hitungan detik dengan domain gratis `.vercel.app` bersertifikat SSL/HTTPS otomatis.

---

## Verifikasi Akun & Uji Coba

1. Buka aplikasi di browser (bisa langsung klik ganda `index.html` atau buka link GitHub Pages / Vercel Anda).
2. **Login Administrator**:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Cek fungsionalitas:
   - [x] **Dashboard**: Statistik guru, kelas, siswa, mapel, dan pengumuman termuat langsung dari Supabase.
   - [x] **Manajemen Pengguna**: Tambah guru baru, ubah profile, reset password.
   - [x] **Kelas & Siswa**: Tambah data kelas dan siswa.
   - [x] **Ujian CBT Online**: Buat ujian baru, bank soal, dan uji coba token ujian siswa.
   - [x] **Absensi Siswa**: Catat kehadiran siswa dan cetak rekap absen.
   - [x] **Pengaturan Sekolah**: Ubah nama sekolah, visi, misi, dan logo.

---

## 🗄️ File Arsip Google Apps Script
File `Code.gs` dan `setupDatabase.gs` yang lama telah dipindahkan ke folder `_archive_gas/`. File ini tidak lagi dijalankan oleh aplikasi, namun tetap disimpan sebagai arsip dokumentasi historis Anda.
