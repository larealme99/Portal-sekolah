-- ============================================================================
-- SCHEMA DATABASE: PORTAL SEKOLAH (SUPABASE / POSTGRESQL)
-- Siap dijalankan langsung di Supabase SQL Editor
-- ============================================================================

-- 1. TABEL USERS (Guru & Administrator)
CREATE TABLE IF NOT EXISTS "Users" (
    "ID" TEXT PRIMARY KEY,
    "Username" TEXT UNIQUE NOT NULL,
    "Password" TEXT NOT NULL,
    "Nama Lengkap" TEXT,
    "Email" TEXT,
    "Role" TEXT DEFAULT 'guru',
    "Status" TEXT DEFAULT 'active',
    "Foto Profil URL" TEXT,
    "Tanggal Daftar" TEXT,
    "Tanggal Approve" TEXT,
    "NIP" TEXT,
    "Telepon" TEXT,
    "Alamat" TEXT,
    "Jenis Kelamin" TEXT,
    "Jenis PTK" TEXT DEFAULT 'Pendidik'
);

-- Migrasi tambahan untuk tabel Users (dapat dijalankan di Supabase SQL Editor):
ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "Jenis Kelamin" TEXT;
ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "Jenis PTK" TEXT DEFAULT 'Pendidik';


-- 2. TABEL PENDING USERS (Registrasi Guru yang Belum Diapprove)
CREATE TABLE IF NOT EXISTS "PendingUsers" (
    "ID" TEXT PRIMARY KEY,
    "Username" TEXT NOT NULL,
    "Password" TEXT NOT NULL,
    "Nama Lengkap" TEXT,
    "Email" TEXT,
    "NIP" TEXT,
    "Telepon" TEXT,
    "Alamat" TEXT,
    "Status" TEXT DEFAULT 'pending',
    "Tanggal Daftar" TEXT,
    "Catatan" TEXT
);

-- 3. TABEL CLASSES (Daftar Kelas)
CREATE TABLE IF NOT EXISTS "Classes" (
    "ID Kelas" TEXT PRIMARY KEY,
    "Nama Kelas" TEXT NOT NULL,
    "Tingkat" TEXT,
    "Jurusan" TEXT,
    "ID Wali Kelas" TEXT,
    "Nama Wali Kelas" TEXT,
    "Tahun Ajaran" TEXT,
    "Kapasitas" NUMERIC DEFAULT 30,
    "Jumlah Siswa" NUMERIC DEFAULT 0,
    "Ruangan" TEXT,
    "Keterangan" TEXT
);

-- 4. TABEL STUDENTS (Daftar Siswa)
CREATE TABLE IF NOT EXISTS "Students" (
    "ID Siswa" TEXT PRIMARY KEY,
    "NIS" TEXT UNIQUE NOT NULL,
    "NISN" TEXT,
    "Nama Siswa" TEXT NOT NULL,
    "Jenis Kelamin" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "Telepon" TEXT,
    "Alamat" TEXT,
    "Status" TEXT DEFAULT 'active'
);

-- 5. TABEL SUBJECTS (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS "Subjects" (
    "ID Mapel" TEXT PRIMARY KEY,
    "Nama Mapel" TEXT NOT NULL,
    "Kode Mapel" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "ID Guru" TEXT,
    "Nama Guru" TEXT,
    "SKS" NUMERIC DEFAULT 1,
    "Hari" TEXT,
    "Jam Mulai" TEXT,
    "Jam Selesai" TEXT,
    "Ruangan" TEXT,
    "Semester" TEXT
);

-- 6. TABEL ATTENDANCE (Absensi Siswa)
CREATE TABLE IF NOT EXISTS "Attendance" (
    "ID Absen" TEXT PRIMARY KEY,
    "Tanggal" TEXT NOT NULL,
    "Hari" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "ID Guru" TEXT,
    "Nama Guru" TEXT,
    "ID Mapel" TEXT,
    "Nama Mapel" TEXT,
    "NIS Siswa" TEXT,
    "Nama Siswa" TEXT,
    "Status" TEXT,
    "Keterangan" TEXT,
    "Jam Absen" TEXT,
    "Diubah Oleh" TEXT,
    "Waktu Ubah" TEXT
);

-- 7. TABEL EXAMS (Ujian Online / CBT)
CREATE TABLE IF NOT EXISTS "Exams" (
    "ID Ujian" TEXT PRIMARY KEY,
    "Judul Ujian" TEXT NOT NULL,
    "ID Mapel" TEXT,
    "Nama Mapel" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "ID Guru" TEXT,
    "Nama Guru" TEXT,
    "Tanggal Mulai" TEXT,
    "Tanggal Selesai" TEXT,
    "Durasi (menit)" NUMERIC DEFAULT 60,
    "Status" TEXT DEFAULT 'draft',
    "Jumlah Soal" NUMERIC DEFAULT 0,
    "Total Nilai" NUMERIC DEFAULT 100,
    "Anti Curang" TEXT DEFAULT 'true',
    "Tanggal Dibuat" TEXT,
    "Keterangan" TEXT,
    "Batas Pelanggaran" NUMERIC DEFAULT 3,
    "Token" TEXT
);

-- 8. TABEL QUESTIONS (Bank Soal Ujian)
CREATE TABLE IF NOT EXISTS "Questions" (
    "ID Soal" TEXT PRIMARY KEY,
    "ID Ujian" TEXT NOT NULL,
    "Nomor Soal" NUMERIC,
    "Tipe Soal" TEXT DEFAULT 'pilihan_ganda',
    "Pertanyaan" TEXT,
    "Opsi A" TEXT,
    "Opsi B" TEXT,
    "Opsi C" TEXT,
    "Opsi D" TEXT,
    "Opsi E" TEXT,
    "Jawaban Benar" TEXT,
    "Poin" NUMERIC DEFAULT 0,
    "Pembahasan" TEXT
);

-- 9. TABEL GRADES (Rekap Nilai Siswa)
CREATE TABLE IF NOT EXISTS "Grades" (
    "ID Nilai" TEXT PRIMARY KEY,
    "ID Ujian" TEXT,
    "Judul Ujian" TEXT,
    "ID Mapel" TEXT,
    "Nama Mapel" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "NIS Siswa" TEXT,
    "Nama Siswa" TEXT,
    "Nilai" NUMERIC DEFAULT 0,
    "Jumlah Benar" NUMERIC DEFAULT 0,
    "Jumlah Salah" NUMERIC DEFAULT 0,
    "Total Soal" NUMERIC DEFAULT 0,
    "Waktu Mulai" TEXT,
    "Waktu Selesai" TEXT,
    "Durasi Mengerjakan" TEXT,
    "ID Guru" TEXT,
    "Nama Guru" TEXT,
    "Catatan Guru" TEXT,
    "Nilai Akhir" NUMERIC DEFAULT 0,
    "Tanggal Input" TEXT,
    "Status" TEXT
);

-- 10. TABEL ANNOUNCEMENTS (Pengumuman Sekolah)
CREATE TABLE IF NOT EXISTS "Announcements" (
    "ID" TEXT PRIMARY KEY,
    "Judul" TEXT NOT NULL,
    "Konten" TEXT,
    "Kategori" TEXT,
    "Prioritas" TEXT DEFAULT 'Normal',
    "ID Pembuat" TEXT,
    "Nama Pembuat" TEXT,
    "Role Pembuat" TEXT,
    "Tanggal Buat" TEXT,
    "Tanggal Update" TEXT,
    "Status" TEXT DEFAULT 'active',
    "Gambar URL" TEXT
);

-- 11. TABEL SETTINGS (Pengaturan Tampilan & Identitas Sekolah)
CREATE TABLE IF NOT EXISTS "Settings" (
    "Key" TEXT PRIMARY KEY,
    "Value" TEXT,
    "Label" TEXT,
    "Keterangan" TEXT,
    "Diupdate" TEXT
);

-- 12. TABEL VIOLATIONS (Catatan Pelanggaran saat Ujian)
CREATE TABLE IF NOT EXISTS "Violations" (
    "ID" TEXT PRIMARY KEY,
    "ID Ujian" TEXT,
    "Judul Ujian" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "NIS Siswa" TEXT,
    "Nama Siswa" TEXT,
    "Jenis Pelanggaran" TEXT,
    "Waktu Pelanggaran" TEXT,
    "Detail" TEXT,
    "Jumlah Pelanggaran" NUMERIC DEFAULT 1
);

-- 13. TABEL EXAM SESSIONS (Sesi Pengerjaan Ujian Siswa)
CREATE TABLE IF NOT EXISTS "ExamSessions" (
    "ID Sesi" TEXT PRIMARY KEY,
    "ID Ujian" TEXT,
    "Judul Ujian" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "NIS Siswa" TEXT,
    "Nama Siswa" TEXT,
    "Status Sesi" TEXT,
    "Waktu Masuk" TEXT,
    "Waktu Selesai" TEXT,
    "Jawaban JSON" TEXT,
    "Pelanggaran" NUMERIC DEFAULT 0,
    "IP Address" TEXT,
    "User Agent" TEXT
);

-- INDEX UNTUK PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_users_username ON "Users"("Username");
CREATE INDEX IF NOT EXISTS idx_students_nis ON "Students"("NIS");
CREATE INDEX IF NOT EXISTS idx_students_class ON "Students"("ID Kelas");
CREATE INDEX IF NOT EXISTS idx_subjects_class ON "Subjects"("ID Kelas");
CREATE INDEX IF NOT EXISTS idx_questions_exam ON "Questions"("ID Ujian");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON "Attendance"("Tanggal", "ID Kelas");
CREATE INDEX IF NOT EXISTS idx_grades_exam ON "Grades"("ID Ujian", "NIS Siswa");
CREATE INDEX IF NOT EXISTS idx_sessions_exam ON "ExamSessions"("ID Ujian", "NIS Siswa");
CREATE INDEX IF NOT EXISTS idx_violations_exam ON "Violations"("ID Ujian", "NIS Siswa");

-- KEBIJAKAN AKSES (ROW LEVEL SECURITY)
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Violations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamSessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;

-- Berikan izin akses penuh untuk Client Web App (Anon Key)
DROP POLICY IF EXISTS "Public Access Users" ON "Users";
CREATE POLICY "Public Access Users" ON "Users" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access PendingUsers" ON "PendingUsers";
CREATE POLICY "Public Access PendingUsers" ON "PendingUsers" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Classes" ON "Classes";
CREATE POLICY "Public Access Classes" ON "Classes" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Students" ON "Students";
CREATE POLICY "Public Access Students" ON "Students" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Subjects" ON "Subjects";
CREATE POLICY "Public Access Subjects" ON "Subjects" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Attendance" ON "Attendance";
CREATE POLICY "Public Access Attendance" ON "Attendance" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Exams" ON "Exams";
CREATE POLICY "Public Access Exams" ON "Exams" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Questions" ON "Questions";
CREATE POLICY "Public Access Questions" ON "Questions" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Grades" ON "Grades";
CREATE POLICY "Public Access Grades" ON "Grades" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Violations" ON "Violations";
CREATE POLICY "Public Access Violations" ON "Violations" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access ExamSessions" ON "ExamSessions";
CREATE POLICY "Public Access ExamSessions" ON "ExamSessions" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Announcements" ON "Announcements";
CREATE POLICY "Public Access Announcements" ON "Announcements" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Settings" ON "Settings";
CREATE POLICY "Public Access Settings" ON "Settings" FOR ALL USING (true) WITH CHECK (true);

-- DATA AWAL: Administrator Default (Password: admin123)
INSERT INTO "Users" ("ID", "Username", "Password", "Nama Lengkap", "Email", "Role", "Status", "Foto Profil URL", "Tanggal Daftar", "Tanggal Approve", "NIP", "Telepon", "Alamat")
VALUES ('USR001', 'admin', 'admin123', 'Administrator', 'admin@sekolah.ac.id', 'admin', 'active', '', NOW()::text, NOW()::text, '000000000000000001', '08000000001', 'Sekolah')
ON CONFLICT ("ID") DO NOTHING;

-- DATA AWAL: Pengaturan Sekolah Dasar
INSERT INTO "Settings" ("Key", "Value", "Label", "Keterangan", "Diupdate")
VALUES 
  ('school_name', 'SMA Negeri 1 Contoh', 'Nama Sekolah', 'Nama lengkap sekolah', NOW()::text),
  ('school_address', 'Jl. Pendidikan No. 1, Kota, Provinsi', 'Alamat Sekolah', 'Alamat lengkap sekolah', NOW()::text),
  ('school_phone', '(021) 000-0000', 'Telepon Sekolah', 'Nomor telepon sekolah', NOW()::text),
  ('school_email', 'info@sman1contoh.sch.id', 'Email Sekolah', 'Email resmi sekolah', NOW()::text),
  ('school_npsn', '00000000', 'NPSN', 'Nomor Pokok Sekolah Nasional', NOW()::text),
  ('school_accreditation', 'A', 'Akreditasi', 'Nilai akreditasi sekolah', NOW()::text),
  ('school_logo_url', '', 'URL Logo', 'URL gambar logo sekolah', NOW()::text),
  ('school_background_url', '', 'URL Background', 'URL gambar background landing page', NOW()::text),
  ('school_vision', 'Menjadi sekolah terbaik yang menghasilkan generasi unggul berkarakter dan berdaya saing global.', 'Visi', 'Visi sekolah', NOW()::text),
  ('school_mission', '1. Melaksanakan pembelajaran berkualitas\n2. Mengembangkan potensi siswa\n3. Membangun karakter bangsa', 'Misi', 'Misi sekolah', NOW()::text),
  ('academic_year', '2024/2025', 'Tahun Ajaran', 'Tahun ajaran aktif', NOW()::text),
  ('semester', 'Ganjil', 'Semester', 'Semester aktif', NOW()::text),
  ('footer_text', '2024 SMA Negeri 1 Contoh. Hak Cipta Dilindungi.', 'Teks Footer', 'Teks di bagian bawah halaman', NOW()::text),
  ('principal_name', 'Drs. H. Kepala Sekolah, M.Pd', 'Nama Kepala Sekolah', 'Nama kepala sekolah', NOW()::text),
  ('principal_nip', '196001011980031001', 'NIP Kepala Sekolah', 'NIP kepala sekolah', NOW()::text)
ON CONFLICT ("Key") DO NOTHING;

-- DATA AWAL: Pengumuman Selamat Datang
INSERT INTO "Announcements" ("ID", "Judul", "Konten", "Kategori", "Prioritas", "ID Pembuat", "Nama Pembuat", "Role Pembuat", "Tanggal Buat", "Tanggal Update", "Status", "Gambar URL")
VALUES ('ANN001', 'Selamat Datang di Portal Sekolah', 'Portal Sekolah resmi diluncurkan. Guru dan siswa dapat mengakses portal ini untuk kegiatan pembelajaran, absensi, dan ujian CBT.', 'Umum', 'Tinggi', 'USR001', 'Administrator', 'admin', NOW()::text, NOW()::text, 'active', '')
ON CONFLICT ("ID") DO NOTHING;

-- 14. TABEL LEARNINGS (Ruang Pembelajaran Mandiri & Modul Siswa)
CREATE TABLE IF NOT EXISTS "Learnings" (
    "ID" TEXT PRIMARY KEY,
    "Judul" TEXT NOT NULL,
    "ID Mapel" TEXT,
    "Nama Mapel" TEXT,
    "ID Kelas" TEXT,
    "Nama Kelas" TEXT,
    "ID Guru" TEXT,
    "Nama Guru" TEXT,
    "Token" TEXT UNIQUE NOT NULL,
    "Ringkasan" TEXT,
    "Konten" TEXT,
    "Media URL" TEXT,
    "Status" TEXT DEFAULT 'active',
    "Tanggal Buat" TEXT,
    "Tanggal Update" TEXT
);

-- 15. TABEL LEARNING SESSIONS (Daftar Siswa Mengakses Ruang Belajar)
CREATE TABLE IF NOT EXISTS "LearningSessions" (
    "ID" TEXT PRIMARY KEY,
    "ID Pembelajaran" TEXT,
    "Judul Pembelajaran" TEXT,
    "Nama Siswa" TEXT NOT NULL,
    "Waktu Masuk" TEXT,
    "Catatan" TEXT
);

ALTER TABLE "Learnings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningSessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Learnings" ON "Learnings";
CREATE POLICY "Public Access Learnings" ON "Learnings" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access LearningSessions" ON "LearningSessions";
CREATE POLICY "Public Access LearningSessions" ON "LearningSessions" FOR ALL USING (true) WITH CHECK (true);

