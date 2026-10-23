// ============================================================
// FILE: SetupDatabase.gs
// DESKRIPSI: Script untuk membuat dan menginisialisasi semua
//            sheet database Google Sheets untuk Portal Sekolah
// ============================================================

/**
 * Fungsi utama setup - jalankan sekali untuk inisialisasi database
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  setupUsersSheet(ss);
  setupPendingUsersSheet(ss);
  setupClassesSheet(ss);
  setupStudentsSheet(ss);
  setupSubjectsSheet(ss);
  setupAttendanceSheet(ss);
  setupExamsSheet(ss);
  setupQuestionsSheet(ss);
  setupGradesSheet(ss);
  setupAnnouncementsSheet(ss);
  setupSettingsSheet(ss);
  setupViolationsSheet(ss);
  setupExamSessionsSheet(ss);
  
  SpreadsheetApp.getUi().alert('Database berhasil disetup! Semua sheet telah dibuat.');
  Logger.log('Database setup selesai.');
}

// SHEET: Users (Guru yang sudah diapprove)
function setupUsersSheet(ss) {
  var sheetName = 'Users';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID', 'Username', 'Password', 'Nama Lengkap', 'Email',
    'Role', 'Status', 'Foto Profil URL', 'Tanggal Daftar',
    'Tanggal Approve', 'NIP', 'Telepon', 'Alamat'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  var adminData = [
    'USR001', 'admin', 'admin123', 'Administrator',
    'admin@sekolah.ac.id', 'admin', 'active', '',
    new Date().toISOString(), new Date().toISOString(), '000000000000000001',
    '08000000001', 'Sekolah'
  ];
  sheet.getRange(2, 1, 1, adminData.length).setValues([adminData]);
  sheet.setFrozenRows(1);
}

// SHEET: PendingUsers (Guru menunggu approval)
function setupPendingUsersSheet(ss) {
  var sheetName = 'PendingUsers';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID', 'Username', 'Password', 'Nama Lengkap', 'Email',
    'NIP', 'Telepon', 'Alamat', 'Status', 'Tanggal Daftar', 'Catatan'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#f9a825')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// SHEET: Classes (Daftar Kelas)
function setupClassesSheet(ss) {
  var sheetName = 'Classes';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Kelas', 'Nama Kelas', 'Tingkat', 'Jurusan',
    'ID Wali Kelas', 'Nama Wali Kelas', 'Tahun Ajaran',
    'Kapasitas', 'Jumlah Siswa', 'Ruangan', 'Keterangan'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0f9d58')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  var sampleClasses = [
    ['KLS001', 'X-A', '10', 'IPA', '', '', '2024/2025', 30, 5, 'R-101', ''],
    ['KLS002', 'X-B', '10', 'IPS', '', '', '2024/2025', 30, 0, 'R-102', ''],
    ['KLS003', 'XI-A', '11', 'IPA', '', '', '2024/2025', 30, 0, 'R-201', ''],
    ['KLS004', 'XI-B', '11', 'IPS', '', '', '2024/2025', 30, 0, 'R-202', ''],
    ['KLS005', 'XII-A', '12', 'IPA', '', '', '2024/2025', 30, 0, 'R-301', ''],
    ['KLS006', 'XII-B', '12', 'IPS', '', '', '2024/2025', 30, 0, 'R-302', '']
  ];
  sheet.getRange(2, 1, sampleClasses.length, headers.length).setValues(sampleClasses);
  sheet.setFrozenRows(1);
}

// SHEET: Students (Daftar Siswa)
function setupStudentsSheet(ss) {
  var sheetName = 'Students';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Siswa', 'NIS', 'NISN', 'Nama Siswa', 'Jenis Kelamin',
    'ID Kelas', 'Nama Kelas', 'Telepon', 'Alamat', 'Status'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#00897b')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  var sampleStudents = [
    ['SIS001', '1001', '0081234501', 'Ahmad Fauzi', 'L', 'KLS001', 'X-A', '08123456001', 'Jl. Merdeka No. 1', 'active'],
    ['SIS002', '1002', '0081234502', 'Budi Santoso', 'L', 'KLS001', 'X-A', '08123456002', 'Jl. Melati No. 2', 'active'],
    ['SIS003', '1003', '0081234503', 'Citra Lestari', 'P', 'KLS001', 'X-A', '08123456003', 'Jl. Mawar No. 3', 'active'],
    ['SIS004', '1004', '0081234504', 'Deni Kurniawan', 'L', 'KLS001', 'X-A', '08123456004', 'Jl. Anggrek No. 4', 'active'],
    ['SIS005', '1005', '0081234505', 'Eka Putri', 'P', 'KLS001', 'X-A', '08123456005', 'Jl. Dahlia No. 5', 'active']
  ];
  sheet.getRange(2, 1, sampleStudents.length, headers.length).setValues(sampleStudents);
  sheet.setFrozenRows(1);
}

// SHEET: Subjects (Daftar Mata Pelajaran per Kelas)
function setupSubjectsSheet(ss) {
  var sheetName = 'Subjects';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Mapel', 'Nama Mapel', 'Kode Mapel', 'ID Kelas',
    'Nama Kelas', 'ID Guru', 'Nama Guru', 'SKS',
    'Hari', 'Jam Mulai', 'Jam Selesai', 'Ruangan', 'Semester'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#db4437')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// SHEET: Attendance (Absen Siswa)
function setupAttendanceSheet(ss) {
  var sheetName = 'Attendance';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Absen', 'Tanggal', 'Hari', 'ID Kelas', 'Nama Kelas',
    'ID Guru', 'Nama Guru', 'ID Mapel', 'Nama Mapel',
    'NIS Siswa', 'Nama Siswa', 'Status',
    'Keterangan', 'Jam Absen', 'Diubah Oleh', 'Waktu Ubah'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4285f4')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// SHEET: Exams (Ujian)
function setupExamsSheet(ss) {
  var sheetName = 'Exams';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Ujian', 'Judul Ujian', 'ID Mapel', 'Nama Mapel',
    'ID Kelas', 'Nama Kelas', 'ID Guru', 'Nama Guru',
    'Tanggal Mulai', 'Tanggal Selesai', 'Durasi (menit)',
    'Status', 'Jumlah Soal', 'Total Nilai', 'Anti Curang',
    'Tanggal Dibuat', 'Keterangan', 'Batas Pelanggaran'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#9c27b0')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  var now = new Date().toISOString();
  var sampleExams = [
    ['EXM1234', 'Penilaian Tengah Semester (PTS) Bersama', 'MPL001', 'Ilmu Pengetahuan Alam', 'KLS001', 'Kelas VII-A', 'USR002', 'Budi Santoso, S.Pd', now, now, 90, 'active', 5, 100, 'true', now, 'Token Ujian Resmi: EXM1234', 3]
  ];
  sheet.getRange(2, 1, sampleExams.length, headers.length).setValues(sampleExams);
}

// SHEET: Questions (Soal Ujian)
function setupQuestionsSheet(ss) {
  var sheetName = 'Questions';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Soal', 'ID Ujian', 'Nomor Soal', 'Tipe Soal',
    'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E',
    'Jawaban Benar', 'Poin', 'Pembahasan'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#ff5722')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);

  var sampleQuestions = [
    ['QST001', 'EXM1234', 1, 'pilihan_ganda', 'Apa fungsi utama klorofil pada daun tumbuhan hijau?', 'Menyerap cahaya matahari untuk fotosintesis', 'Menyerap air dari tanah', 'Menghasilkan karbondioksida', 'Melindungi dari serangga', 'Menggugurkan daun', 'A', 20, 'Klorofil berperan menyerap foton cahaya'],
    ['QST002', 'EXM1234', 2, 'pilihan_ganda', 'Ibu kota negara Indonesia Nusantara (IKN) terletak di provinsi...', 'Kalimantan Timur', 'Kalimantan Barat', 'Kalimantan Tengah', 'Sulawesi Selatan', 'Jawa Barat', 'A', 20, 'IKN terletak di Penajam Paser Utara & Kutai Kartanegara, Kaltim'],
    ['QST003', 'EXM1234', 3, 'pilihan_ganda', 'Hasil perhitungan matematika: 15 × 8 + 40 ÷ 5 adalah...', '128', '124', '130', '120', '118', 'A', 20, '120 + 8 = 128'],
    ['QST004', 'EXM1234', 4, 'pilihan_ganda', 'Sila ke-3 dalam Pancasila berbunyi...', 'Persatuan Indonesia', 'Kemanusiaan yang adil dan beradab', 'Ketuhanan Yang Maha Esa', 'Keadilan sosial bagi seluruh rakyat Indonesia', 'Kerakyatan yang dipimpin oleh hikmat', 'A', 20, 'Sila ke-3 adalah Persatuan Indonesia'],
    ['QST005', 'EXM1234', 5, 'pilihan_ganda', 'Planet dalam tata surya yang dikenal dengan julukan Planet Merah adalah...', 'Mars', 'Venus', 'Jupiter', 'Merkurius', 'Saturnus', 'A', 20, 'Mars tampak kemerahan karena oksida besi di permukaannya']
  ];
  sheet.getRange(2, 1, sampleQuestions.length, headers.length).setValues(sampleQuestions);
}

// SHEET: Grades (Rekap Nilai)
function setupGradesSheet(ss) {
  var sheetName = 'Grades';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Nilai', 'ID Ujian', 'Judul Ujian', 'ID Mapel', 'Nama Mapel',
    'ID Kelas', 'Nama Kelas', 'NIS Siswa', 'Nama Siswa',
    'Nilai', 'Jumlah Benar', 'Jumlah Salah', 'Total Soal',
    'Waktu Mulai', 'Waktu Selesai', 'Durasi Mengerjakan',
    'ID Guru', 'Nama Guru', 'Catatan Guru', 'Nilai Akhir',
    'Tanggal Input', 'Status'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#607d8b')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// SHEET: Announcements (Pengumuman)
function setupAnnouncementsSheet(ss) {
  var sheetName = 'Announcements';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID', 'Judul', 'Konten', 'Kategori', 'Prioritas',
    'ID Pembuat', 'Nama Pembuat', 'Role Pembuat',
    'Tanggal Buat', 'Tanggal Update', 'Status', 'Gambar URL'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#00bcd4')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  var now = new Date().toISOString();
  var sampleAnnouncements = [
    ['ANN001', 'Selamat Datang di Portal Sekolah', 
     'Portal Sekolah resmi diluncurkan. Semua guru dan siswa dapat mengakses portal ini untuk kebutuhan akademik.',
     'Umum', 'Tinggi', 'USR001', 'Administrator', 'admin', now, now, 'active', ''],
    ['ANN002', 'Jadwal Ujian Tengah Semester',
     'Ujian Tengah Semester akan dilaksanakan pada tanggal yang telah ditentukan. Mohon persiapan.',
     'Akademik', 'Normal', 'USR001', 'Administrator', 'admin', now, now, 'active', '']
  ];
  sheet.getRange(2, 1, sampleAnnouncements.length, headers.length).setValues(sampleAnnouncements);
  sheet.setFrozenRows(1);
}

// SHEET: Settings (Pengaturan Tampilan)
function setupSettingsSheet(ss) {
  var sheetName = 'Settings';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = ['Key', 'Value', 'Label', 'Keterangan', 'Diupdate'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#795548')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  var now = new Date().toISOString();
  var defaultSettings = [
    ['school_name', 'SMA Negeri 1 Contoh', 'Nama Sekolah', 'Nama lengkap sekolah', now],
    ['school_address', 'Jl. Pendidikan No. 1, Kota, Provinsi', 'Alamat Sekolah', 'Alamat lengkap sekolah', now],
    ['school_phone', '(021) 000-0000', 'Telepon Sekolah', 'Nomor telepon sekolah', now],
    ['school_email', 'info@sman1contoh.sch.id', 'Email Sekolah', 'Email resmi sekolah', now],
    ['school_npsn', '00000000', 'NPSN', 'Nomor Pokok Sekolah Nasional', now],
    ['school_accreditation', 'A', 'Akreditasi', 'Nilai akreditasi sekolah', now],
    ['school_logo_url', '', 'URL Logo', 'URL gambar logo sekolah', now],
    ['school_background_url', '', 'URL Background', 'URL gambar background landing page', now],
    ['school_vision', 'Menjadi sekolah terbaik yang menghasilkan generasi unggul berkarakter dan berdaya saing global.', 'Visi', 'Visi sekolah', now],
    ['school_mission', '1. Melaksanakan pembelajaran berkualitas\n2. Mengembangkan potensi siswa\n3. Membangun karakter bangsa', 'Misi', 'Misi sekolah', now],
    ['academic_year', '2024/2025', 'Tahun Ajaran', 'Tahun ajaran aktif', now],
    ['semester', 'Ganjil', 'Semester', 'Semester aktif', now],
    ['footer_text', '2024 SMA Negeri 1 Contoh. Hak Cipta Dilindungi.', 'Teks Footer', 'Teks di bagian bawah halaman', now],
    ['principal_name', 'Drs. H. Kepala Sekolah, M.Pd', 'Nama Kepala Sekolah', 'Nama kepala sekolah', now],
    ['principal_nip', '196001011980031001', 'NIP Kepala Sekolah', 'NIP kepala sekolah', now]
  ];
  sheet.getRange(2, 1, defaultSettings.length, headers.length).setValues(defaultSettings);
  sheet.setFrozenRows(1);
}

// SHEET: Violations (Pelanggaran saat Ujian)
function setupViolationsSheet(ss) {
  var sheetName = 'Violations';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID', 'ID Ujian', 'Judul Ujian', 'ID Kelas', 'Nama Kelas',
    'NIS Siswa', 'Nama Siswa', 'Jenis Pelanggaran',
    'Waktu Pelanggaran', 'Detail', 'Jumlah Pelanggaran'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#e53935')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// SHEET: ExamSessions (Sesi Pengerjaan Ujian Siswa)
function setupExamSessionsSheet(ss) {
  var sheetName = 'ExamSessions';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  
  var headers = [
    'ID Sesi', 'ID Ujian', 'Judul Ujian', 'ID Kelas', 'Nama Kelas',
    'NIS Siswa', 'Nama Siswa', 'Status Sesi',
    'Waktu Masuk', 'Waktu Selesai', 'Jawaban JSON',
    'Pelanggaran', 'IP Address', 'User Agent'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#5c6bc0')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// UTILITY: Hash Password
function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + 'SALT_PORTAL_SEKOLAH_2024'
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// UTILITY: Generate ID
function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + 
         Math.random().toString(36).substr(2, 4).toUpperCase();
}

// MENU Spreadsheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Portal Sekolah')
    .addItem('Setup Database (Jalankan Pertama Kali)', 'setupDatabase')
    .addSeparator()
    .addItem('Reset Database (HATI-HATI!)', 'resetDatabase')
    .addToUi();
}

function resetDatabase() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'PERINGATAN',
    'Apakah Anda yakin ingin mereset database? Semua data akan DIHAPUS!',
    ui.ButtonSet.YES_NO
  );
  if (response == ui.Button.YES) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
      if (sheets.length > 1) ss.deleteSheet(sheet);
    });
    setupDatabase();
  }
}
