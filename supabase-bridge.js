// ============================================================================
// FILE: supabase-bridge.js
// DESKRIPSI: Jembatan Standalone Pengganti Google Apps Script (Code.gs)
//             Menghubungkan Frontend langsung ke Supabase Client
// ============================================================================

(function () {
  'use strict';

  // 1. Inisialisasi Supabase
  const config = window.PORTAL_CONFIG || {};
  let supabaseClient = null;

  function getClient() {
    if (!supabaseClient) {
      if (!window.supabase) {
        console.error('[Portal Sekolah] Supabase SDK belum dimuat. Pastikan CDN supabase-js ada di <head>.');
        return null;
      }
      if (!config.SUPABASE_URL || config.SUPABASE_URL.includes('GANTI_DENGAN')) {
        console.warn('[Portal Sekolah] Supabase URL & Anon Key belum diisi di supabase-config.js!');
      }
      supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return supabaseClient;
  }

  // Helper Hashing & ID Generator
  async function hashPassword(str) {
    const salted = (str || '') + 'SALT_PORTAL_SEKOLAH_2024';
    const msgBuffer = new TextEncoder().encode(salted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateId(prefix) {
    return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  function getDayName(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateStr);
    return isNaN(d.getDay()) ? '' : days[d.getDay()];
  }

  // 2. Kumpulan Seluruh Handler Backend (Pengganti Code.gs)
  const Handlers = {
    // --- GENERIC GET ALL DATA ---
    async getAllData(tableName) {
      const sb = getClient();
      if (!sb) return [];
      const { data, error } = await sb.from(tableName).select('*');
      if (error) {
        console.error(`[getAllData] Error on ${tableName}:`, error);
        return [];
      }
      return data || [];
    },

    // --- AUTHENTICATION & USERS ---
    async loginUser(username, password) {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.' };
        const hashed = await hashPassword(password);

        const { data, error } = await sb.from('Users')
          .select('*')
          .eq('Username', username)
          .eq('Status', 'active');

        if (error) throw error;
        if (!data || data.length === 0) {
          return { success: false, message: 'Username tidak ditemukan atau akun belum aktif.' };
        }

        const u = data[0];
        if (u.Password === hashed || u.Password === password) {
          return {
            success: true,
            user: {
              id: u['ID'],
              username: u['Username'],
              namaLengkap: u['Nama Lengkap'],
              email: u['Email'],
              role: u['Role'],
              fotoProfil: u['Foto Profil URL'],
              nip: u['NIP'],
              telepon: u['Telepon'],
              alamat: u['Alamat']
            }
          };
        }
        return { success: false, message: 'Password salah!' };
      } catch (e) {
        console.error('[loginUser Error]:', e);
        const msg = e.message || (typeof e === 'string' ? e : 'Terjadi kesalahan sistem.');
        const hint = e.hint ? ` (${e.hint})` : '';
        return { success: false, message: msg + hint };
      }
    },

    async registerGuru(userData) {
      try {
        const sb = getClient();
        const checkU = await sb.from('Users').select('ID').eq('Username', userData.username);
        if (checkU.data && checkU.data.length > 0) return { success: false, message: 'Username sudah digunakan.' };

        const checkP = await sb.from('PendingUsers').select('ID').eq('Username', userData.username);
        if (checkP.data && checkP.data.length > 0) return { success: false, message: 'Username sudah terdaftar, menunggu persetujuan.' };

        const newId = generateId('PND');
        const now = new Date().toISOString();
        const { error } = await sb.from('PendingUsers').insert([{
          'ID': newId,
          'Username': userData.username,
          'Password': userData.password,
          'Nama Lengkap': userData.namaLengkap,
          'Email': userData.email,
          'NIP': userData.nip || '',
          'Telepon': userData.telepon || '',
          'Alamat': userData.alamat || '',
          'Status': 'pending',
          'Tanggal Daftar': now,
          'Catatan': ''
        }]);
        if (error) throw error;
        return { success: true, message: 'Pendaftaran berhasil! Menunggu persetujuan admin.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getPendingUsers() {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.', data: [] };
        const { data, error } = await sb.from('PendingUsers').select('*').order('Tanggal Daftar', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
      } catch (e) {
        console.error('[getPendingUsers error]:', e);
        return { success: false, message: e.message || 'Gagal memuat data pendaftaran.', data: [] };
      }
    },

    async approveUser(pendingId) {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.' };
        const { data: pList, error: pErr } = await sb.from('PendingUsers').select('*').eq('ID', pendingId);
        if (pErr) throw pErr;
        if (!pList || pList.length === 0) return { success: false, message: 'Data pendaftaran tidak ditemukan.' };
        const p = pList[0];

        const newUserId = generateId('USR');
        const now = new Date().toISOString();

        const { error: insErr } = await sb.from('Users').insert([{
          'ID': newUserId,
          'Username': p['Username'],
          'Password': p['Password'],
          'Nama Lengkap': p['Nama Lengkap'],
          'Email': p['Email'],
          'Role': 'guru',
          'Status': 'active',
          'Foto Profil URL': '',
          'Tanggal Daftar': p['Tanggal Daftar'] || now,
          'Tanggal Approve': now,
          'NIP': p['NIP'] || '',
          'Telepon': p['Telepon'] || '',
          'Alamat': p['Alamat'] || ''
        }]);
        if (insErr) throw insErr;

        await sb.from('PendingUsers').delete().eq('ID', pendingId);
        return { success: true, message: 'Guru berhasil disetujui.' };
      } catch (e) {
        console.error('[approveUser error]:', e);
        return { success: false, message: e.message };
      }
    },

    async rejectUser(pendingId) {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.' };
        const { error } = await sb.from('PendingUsers').delete().eq('ID', pendingId);
        if (error) throw error;
        return { success: true, message: 'Pendaftaran ditolak.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deletePendingUser(id) {
      return await this.rejectUser(id);
    },

    async getUsers() {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.', data: [] };
        const { data, error } = await sb.from('Users').select('*').order('Nama Lengkap', { ascending: true });
        if (error) throw error;
        const filtered = (data || []).filter(u => u.Role !== 'admin');
        return { success: true, data: filtered };
      } catch (e) {
        console.error('[getUsers error]:', e);
        return { success: false, message: e.message || 'Gagal memuat daftar guru.', data: [] };
      }
    },

    async getAllUsers() {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.', data: [] };
        const { data, error } = await sb.from('Users').select('*');
        if (error) throw error;
        return { success: true, data: data || [] };
      } catch (e) {
        console.error('[getAllUsers error]:', e);
        return { success: false, message: e.message || 'Gagal memuat data pengguna.', data: [] };
      }
    },

    async getUserById(userId) {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.' };
        const { data, error } = await sb.from('Users').select('*').eq('ID', userId);
        if (error) throw error;
        if (data && data.length > 0) return { success: true, data: data[0], user: data[0] };
        return { success: false, message: 'User tidak ditemukan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async adminCreateUser(data) {
      try {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Supabase client belum siap.' };

        const { data: existing } = await sb.from('Users').select('ID').eq('Username', data.username);
        if (existing && existing.length > 0) {
          return { success: false, message: 'Username sudah digunakan oleh akun lain.' };
        }

        const newId = generateId('USR');
        const now = new Date().toISOString();
        const { error } = await sb.from('Users').insert([{
          'ID': newId,
          'Username': data.username,
          'Password': data.password,
          'Nama Lengkap': data.namaLengkap,
          'Email': data.email || '',
          'Role': data.role || 'guru',
          'Status': data.status || 'active',
          'Foto Profil URL': data.fotoProfil || '',
          'Tanggal Daftar': now,
          'Tanggal Approve': now,
          'NIP': data.nip || '',
          'Telepon': data.telepon || '',
          'Alamat': data.alamat || ''
        }]);
        if (error) throw error;
        return { success: true, message: 'Guru berhasil ditambahkan.' };
      } catch (e) {
        console.error('[adminCreateUser error]:', e);
        return { success: false, message: e.message };
      }
    },

    async adminUpdateUser(userId, updateData) {
      try {
        const sb = getClient();
        const updateFields = {};
        if (updateData.namaLengkap !== undefined) updateFields['Nama Lengkap'] = updateData.namaLengkap;
        if (updateData.email !== undefined) updateFields['Email'] = updateData.email;
        if (updateData.role !== undefined) updateFields['Role'] = updateData.role;
        if (updateData.status !== undefined) updateFields['Status'] = updateData.status;
        if (updateData.nip !== undefined) updateFields['NIP'] = updateData.nip;
        if (updateData.telepon !== undefined) updateFields['Telepon'] = updateData.telepon;
        if (updateData.alamat !== undefined) updateFields['Alamat'] = updateData.alamat;
        if (updateData.password) updateFields['Password'] = updateData.password;

        const { error } = await sb.from('Users').update(updateFields).eq('ID', userId);
        if (error) throw error;
        return { success: true, message: 'User berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteUser(userId) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Users').delete().eq('ID', userId);
        if (error) throw error;
        return { success: true, message: 'User berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateUserProfile(userId, updateData) {
      return await this.adminUpdateUser(userId, updateData);
    },

    async updateUserPassword(userId, oldPassword, newPassword) {
      try {
        const sb = getClient();
        const { data: users } = await sb.from('Users').select('*').eq('ID', userId);
        if (!users || users.length === 0) return { success: false, message: 'User tidak ditemukan.' };
        const u = users[0];
        const oldHashed = await hashPassword(oldPassword);
        if (u.Password !== oldPassword && u.Password !== oldHashed) {
          return { success: false, message: 'Password lama tidak sesuai.' };
        }
        const newHashed = await hashPassword(newPassword);
        await sb.from('Users').update({ 'Password': newHashed }).eq('ID', userId);
        return { success: true, message: 'Password berhasil diubah.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateUsername(userId, newUsername, password) {
      try {
        const sb = getClient();
        const { data: users } = await sb.from('Users').select('*').eq('ID', userId);
        if (!users || users.length === 0) return { success: false, message: 'User tidak ditemukan.' };
        const u = users[0];
        const pwHashed = await hashPassword(password);
        if (u.Password !== password && u.Password !== pwHashed) {
          return { success: false, message: 'Password verifikasi salah.' };
        }
        await sb.from('Users').update({ 'Username': newUsername }).eq('ID', userId);
        return { success: true, message: 'Username berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- SETTINGS (PENGATURAN SEKOLAH) ---
    async getSettings() {
      try {
        const sb = getClient();
        const { data, error } = await sb.from('Settings').select('*');
        if (error) throw error;
        const settings = {};
        (data || []).forEach(row => { settings[row.Key] = row.Value; });
        return { success: true, data: settings };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateSettings(settingsObj) {
      try {
        const sb = getClient();
        const now = new Date().toISOString();
        const upsertRows = [];
        for (const key in settingsObj) {
          upsertRows.push({
            'Key': key,
            'Value': String(settingsObj[key] ?? ''),
            'Diupdate': now
          });
        }
        const { error } = await sb.from('Settings').upsert(upsertRows, { onConflict: 'Key' });
        if (error) throw error;
        return { success: true, message: 'Pengaturan sekolah berhasil disimpan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- CLASSES (KELAS) ---
    async getClasses() {
      const data = await this.getAllData('Classes');
      return { success: true, data: data };
    },

    async createClass(data) {
      try {
        const sb = getClient();
        const newId = generateId('KLS');
        const { error } = await sb.from('Classes').insert([{
          'ID Kelas': newId,
          'Nama Kelas': data.namaKelas,
          'Tingkat': data.tingkat || '',
          'Jurusan': data.jurusan || '',
          'ID Wali Kelas': data.idWaliKelas || '',
          'Nama Wali Kelas': data.namaWaliKelas || '',
          'Tahun Ajaran': data.tahunAjaran || '2024/2025',
          'Kapasitas': Number(data.kapasitas || 30),
          'Jumlah Siswa': 0,
          'Ruangan': data.ruangan || '',
          'Keterangan': data.keterangan || ''
        }]);
        if (error) throw error;
        return { success: true, message: 'Kelas berhasil ditambahkan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateClass(id, data) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Classes').update({
          'Nama Kelas': data.namaKelas,
          'Tingkat': data.tingkat,
          'Jurusan': data.jurusan,
          'ID Wali Kelas': data.idWaliKelas,
          'Nama Wali Kelas': data.namaWaliKelas,
          'Tahun Ajaran': data.tahunAjaran,
          'Kapasitas': Number(data.kapasitas || 30),
          'Ruangan': data.ruangan,
          'Keterangan': data.keterangan
        }).eq('ID Kelas', id);
        if (error) throw error;
        return { success: true, message: 'Kelas berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteClass(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Classes').delete().eq('ID Kelas', id);
        if (error) throw error;
        return { success: true, message: 'Kelas berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- STUDENTS (SISWA) ---
    async getStudents(classId) {
      const sb = getClient();
      let query = sb.from('Students').select('*');
      if (classId) query = query.eq('ID Kelas', classId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    async createStudent(data) {
      try {
        const sb = getClient();
        const newId = generateId('SIS');
        const { error } = await sb.from('Students').insert([{
          'ID Siswa': newId,
          'NIS': String(data.nis),
          'NISN': String(data.nisn || ''),
          'Nama Siswa': data.namaSiswa,
          'Jenis Kelamin': data.jenisKelamin || 'L',
          'ID Kelas': data.idKelas,
          'Nama Kelas': data.namaKelas,
          'Telepon': data.telepon || '',
          'Alamat': data.alamat || '',
          'Status': data.status || 'active'
        }]);
        if (error) throw error;
        return { success: true, message: 'Data siswa berhasil disimpan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateStudent(id, data) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Students').update({
          'NIS': String(data.nis),
          'NISN': String(data.nisn || ''),
          'Nama Siswa': data.namaSiswa,
          'Jenis Kelamin': data.jenisKelamin,
          'ID Kelas': data.idKelas,
          'Nama Kelas': data.namaKelas,
          'Telepon': data.telepon,
          'Alamat': data.alamat,
          'Status': data.status
        }).eq('ID Siswa', id);
        if (error) throw error;
        return { success: true, message: 'Data siswa berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteStudent(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Students').delete().eq('ID Siswa', id);
        if (error) throw error;
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- SUBJECTS (MATA PELAJARAN) ---
    async getSubjects(classId) {
      const sb = getClient();
      let query = sb.from('Subjects').select('*');
      if (classId) query = query.eq('ID Kelas', classId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    async getSubjectsByGuru(guruId) {
      const sb = getClient();
      let query = sb.from('Subjects').select('*');
      if (guruId) query = query.eq('ID Guru', guruId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    async createSubject(data) {
      try {
        const sb = getClient();
        const newId = generateId('MPL');
        const { error } = await sb.from('Subjects').insert([{
          'ID Mapel': newId,
          'Nama Mapel': data.namaMapel,
          'Kode Mapel': data.kodeMapel || '',
          'ID Kelas': data.idKelas,
          'Nama Kelas': data.namaKelas,
          'ID Guru': data.idGuru || '',
          'Nama Guru': data.namaGuru || '',
          'SKS': Number(data.sks || 1),
          'Hari': data.hari || '',
          'Jam Mulai': data.jamMulai || '',
          'Jam Selesai': data.jamSelesai || '',
          'Ruangan': data.ruangan || '',
          'Semester': data.semester || 'Ganjil'
        }]);
        if (error) throw error;
        return { success: true, message: 'Mata pelajaran berhasil ditambahkan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateSubject(id, data) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Subjects').update({
          'Nama Mapel': data.namaMapel,
          'Kode Mapel': data.kodeMapel,
          'ID Kelas': data.idKelas,
          'Nama Kelas': data.namaKelas,
          'ID Guru': data.idGuru,
          'Nama Guru': data.namaGuru,
          'SKS': Number(data.sks || 1),
          'Hari': data.hari,
          'Jam Mulai': data.jamMulai,
          'Jam Selesai': data.jamSelesai,
          'Ruangan': data.ruangan,
          'Semester': data.semester
        }).eq('ID Mapel', id);
        if (error) throw error;
        return { success: true, message: 'Mata pelajaran berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteSubject(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Subjects').delete().eq('ID Mapel', id);
        if (error) throw error;
        return { success: true, message: 'Mata pelajaran berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- EXAMS (UJIAN ONLINE / CBT) ---
    async getExams(guruId) {
      const sb = getClient();
      let query = sb.from('Exams').select('*');
      if (guruId) query = query.eq('ID Guru', guruId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    async createExam(data) {
      try {
        const sb = getClient();
        const newId = generateId('EXM');
        const now = new Date().toISOString();
        const token = (data.tokenUjian || data.token || newId).trim().toUpperCase();

        const { error } = await sb.from('Exams').insert([{
          'ID Ujian': newId,
          'Judul Ujian': data.judulUjian,
          'ID Mapel': data.idMapel || '',
          'Nama Mapel': data.namaMapel || '',
          'ID Kelas': data.idKelas || '',
          'Nama Kelas': data.namaKelas || '',
          'ID Guru': data.idGuru || '',
          'Nama Guru': data.namaGuru || '',
          'Tanggal Mulai': data.tanggalMulai || now,
          'Tanggal Selesai': data.tanggalSelesai || now,
          'Durasi (menit)': Number(data.durasi || 60),
          'Status': data.status || 'draft',
          'Jumlah Soal': Number(data.jumlahSoal || 0),
          'Total Nilai': Number(data.totalNilai || 100),
          'Anti Curang': String(data.antiCurang ?? 'true'),
          'Tanggal Dibuat': now,
          'Keterangan': data.keterangan || '',
          'Batas Pelanggaran': Number(data.batasPelanggaran || 3),
          'Token': token
        }]);
        if (error) throw error;

        if (data.autoSeed) {
          await this.seedSampleQuestions(newId);
        }

        return { success: true, message: 'Ujian berhasil dibuat.', id: newId };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateExam(id, data) {
      try {
        const sb = getClient();
        const updateFields = {};
        if (data.judulUjian !== undefined) updateFields['Judul Ujian'] = data.judulUjian;
        if (data.idMapel !== undefined) updateFields['ID Mapel'] = data.idMapel;
        if (data.namaMapel !== undefined) updateFields['Nama Mapel'] = data.namaMapel;
        if (data.idKelas !== undefined) updateFields['ID Kelas'] = data.idKelas;
        if (data.namaKelas !== undefined) updateFields['Nama Kelas'] = data.namaKelas;
        if (data.durasi !== undefined) updateFields['Durasi (menit)'] = Number(data.durasi);
        if (data.status !== undefined) updateFields['Status'] = data.status;
        if (data.antiCurang !== undefined) updateFields['Anti Curang'] = String(data.antiCurang);
        if (data.keterangan !== undefined) updateFields['Keterangan'] = data.keterangan;
        if (data.batasPelanggaran !== undefined) updateFields['Batas Pelanggaran'] = Number(data.batasPelanggaran);
        if (data.tokenUjian !== undefined || data.token !== undefined) updateFields['Token'] = (data.tokenUjian || data.token).trim().toUpperCase();

        const { error } = await sb.from('Exams').update(updateFields).eq('ID Ujian', id);
        if (error) throw error;
        return { success: true, message: 'Ujian berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteExam(id) {
      try {
        const sb = getClient();
        await sb.from('Questions').delete().eq('ID Ujian', id);
        await sb.from('Grades').delete().eq('ID Ujian', id);
        await sb.from('Violations').delete().eq('ID Ujian', id);
        await sb.from('ExamSessions').delete().eq('ID Ujian', id);
        const { error } = await sb.from('Exams').delete().eq('ID Ujian', id);
        if (error) throw error;
        return { success: true, message: 'Ujian dan semua soal terkait berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async copyExamToClass(examId, targetClassId, targetClassName, newToken) {
      try {
        const sb = getClient();
        const { data: exams } = await sb.from('Exams').select('*').eq('ID Ujian', examId);
        if (!exams || exams.length === 0) return { success: false, message: 'Ujian asal tidak ditemukan.' };
        const src = exams[0];

        const newExamId = generateId('EXM');
        const now = new Date().toISOString();
        const token = (newToken || newExamId).trim().toUpperCase();

        await sb.from('Exams').insert([{
          'ID Ujian': newExamId,
          'Judul Ujian': src['Judul Ujian'] + ' (' + targetClassName + ')',
          'ID Mapel': src['ID Mapel'],
          'Nama Mapel': src['Nama Mapel'],
          'ID Kelas': targetClassId,
          'Nama Kelas': targetClassName,
          'ID Guru': src['ID Guru'],
          'Nama Guru': src['Nama Guru'],
          'Tanggal Mulai': src['Tanggal Mulai'] || now,
          'Tanggal Selesai': src['Tanggal Selesai'] || now,
          'Durasi (menit)': src['Durasi (menit)'],
          'Status': 'draft',
          'Jumlah Soal': src['Jumlah Soal'],
          'Total Nilai': src['Total Nilai'],
          'Anti Curang': src['Anti Curang'],
          'Tanggal Dibuat': now,
          'Keterangan': src['Keterangan'],
          'Batas Pelanggaran': src['Batas Pelanggaran'],
          'Token': token
        }]);

        // Salin seluruh soal
        const { data: questions } = await sb.from('Questions').select('*').eq('ID Ujian', examId);
        if (questions && questions.length > 0) {
          const newQuestions = questions.map(q => ({
            ...q,
            'ID Soal': generateId('QST'),
            'ID Ujian': newExamId
          }));
          await sb.from('Questions').insert(newQuestions);
        }

        return { success: true, message: 'Ujian berhasil disalin ke kelas ' + targetClassName };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- QUESTIONS (SOAL UJIAN) ---
    async getQuestions(examId) {
      const sb = getClient();
      const { data, error } = await sb.from('Questions')
        .select('*')
        .eq('ID Ujian', examId)
        .order('Nomor Soal', { ascending: true });
      return { success: !error, data: data || [] };
    },

    async createQuestion(data) {
      try {
        const sb = getClient();
        const newId = generateId('QST');
        const { error } = await sb.from('Questions').insert([{
          'ID Soal': newId,
          'ID Ujian': data.idUjian,
          'Nomor Soal': Number(data.nomorSoal || 1),
          'Tipe Soal': data.tipeSoal || 'pilihan_ganda',
          'Pertanyaan': data.pertanyaan,
          'Opsi A': data.opsiA || '',
          'Opsi B': data.opsiB || '',
          'Opsi C': data.opsiC || '',
          'Opsi D': data.opsiD || '',
          'Opsi E': data.opsiE || '',
          'Jawaban Benar': (data.jawabanBenar || '').trim().toUpperCase(),
          'Poin': Number(data.poin || 10),
          'Pembahasan': data.pembahasan || ''
        }]);
        if (error) throw error;

        // Update jumlah soal di tabel Exams
        const countRes = await sb.from('Questions').select('ID Soal', { count: 'exact' }).eq('ID Ujian', data.idUjian);
        await sb.from('Exams').update({ 'Jumlah Soal': countRes.count || 0 }).eq('ID Ujian', data.idUjian);

        return { success: true, message: 'Soal berhasil disimpan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateQuestion(id, data) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Questions').update({
          'Nomor Soal': Number(data.nomorSoal),
          'Tipe Soal': data.tipeSoal,
          'Pertanyaan': data.pertanyaan,
          'Opsi A': data.opsiA,
          'Opsi B': data.opsiB,
          'Opsi C': data.opsiC,
          'Opsi D': data.opsiD,
          'Opsi E': data.opsiE,
          'Jawaban Benar': (data.jawabanBenar || '').trim().toUpperCase(),
          'Poin': Number(data.poin),
          'Pembahasan': data.pembahasan
        }).eq('ID Soal', id);
        if (error) throw error;
        return { success: true, message: 'Soal berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteQuestion(id) {
      try {
        const sb = getClient();
        const { data: q } = await sb.from('Questions').select('ID Ujian').eq('ID Soal', id);
        const examId = q && q.length > 0 ? q[0]['ID Ujian'] : null;

        await sb.from('Questions').delete().eq('ID Soal', id);

        if (examId) {
          const countRes = await sb.from('Questions').select('ID Soal', { count: 'exact' }).eq('ID Ujian', examId);
          await sb.from('Exams').update({ 'Jumlah Soal': countRes.count || 0 }).eq('ID Ujian', examId);
        }
        return { success: true, message: 'Soal berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async seedSampleQuestions(examId) {
      try {
        const sb = getClient();
        const sampleQs = [
          { 'ID Soal': generateId('QST'), 'ID Ujian': examId, 'Nomor Soal': 1, 'Tipe Soal': 'pilihan_ganda', 'Pertanyaan': 'Apa fungsi utama klorofil pada daun tumbuhan hijau?', 'Opsi A': 'Menyerap cahaya matahari untuk fotosintesis', 'Opsi B': 'Menyerap air dari tanah', 'Opsi C': 'Menghasilkan karbondioksida', 'Opsi D': 'Melindungi dari serangga', 'Opsi E': 'Menggugurkan daun', 'Jawaban Benar': 'A', 'Poin': 20, 'Pembahasan': 'Klorofil berperan menyerap foton cahaya untuk fotosintesis.' },
          { 'ID Soal': generateId('QST'), 'ID Ujian': examId, 'Nomor Soal': 2, 'Tipe Soal': 'pilihan_ganda', 'Pertanyaan': 'Ibu kota negara Indonesia Nusantara (IKN) terletak di provinsi...', 'Opsi A': 'Kalimantan Timur', 'Opsi B': 'Kalimantan Barat', 'Opsi C': 'Kalimantan Tengah', 'Opsi D': 'Sulawesi Selatan', 'Opsi E': 'Jawa Barat', 'Jawaban Benar': 'A', 'Poin': 20, 'Pembahasan': 'IKN berlokasi di Kalimantan Timur.' },
          { 'ID Soal': generateId('QST'), 'ID Ujian': examId, 'Nomor Soal': 3, 'Tipe Soal': 'pilihan_ganda', 'Pertanyaan': 'Hasil perhitungan matematika: 15 × 8 + 40 ÷ 5 adalah...', 'Opsi A': '128', 'Opsi B': '124', 'Opsi C': '130', 'Opsi D': '120', 'Opsi E': '118', 'Jawaban Benar': 'A', 'Poin': 20, 'Pembahasan': '120 + 8 = 128.' },
          { 'ID Soal': generateId('QST'), 'ID Ujian': examId, 'Nomor Soal': 4, 'Tipe Soal': 'pilihan_ganda', 'Pertanyaan': 'Sila ke-3 dalam Pancasila berbunyi...', 'Opsi A': 'Persatuan Indonesia', 'Opsi B': 'Kemanusiaan yang adil dan beradab', 'Opsi C': 'Ketuhanan Yang Maha Esa', 'Opsi D': 'Keadilan sosial bagi seluruh rakyat Indonesia', 'Opsi E': 'Kerakyatan yang dipimpin oleh hikmat', 'Jawaban Benar': 'A', 'Poin': 20, 'Pembahasan': 'Sila ke-3 adalah Persatuan Indonesia.' },
          { 'ID Soal': generateId('QST'), 'ID Ujian': examId, 'Nomor Soal': 5, 'Tipe Soal': 'pilihan_ganda', 'Pertanyaan': 'Planet dalam tata surya yang dikenal dengan julukan Planet Merah adalah...', 'Opsi A': 'Mars', 'Opsi B': 'Venus', 'Opsi C': 'Jupiter', 'Opsi D': 'Merkurius', 'Opsi E': 'Saturnus', 'Jawaban Benar': 'A', 'Poin': 20, 'Pembahasan': 'Mars tampak kemerahan karena keberadaan oksida besi.' }
        ];
        await sb.from('Questions').insert(sampleQs);
        await sb.from('Exams').update({ 'Jumlah Soal': sampleQs.length }).eq('ID Ujian', examId);
        return { success: true };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- ALUR CBT SISWA (VALIDASI, PENGERJAAN, SUBMISI) ---
    async validateAndStartExam(namaSiswa, token) {
      try {
        const sb = getClient();
        const tokenClean = (token || '').toString().trim().toUpperCase();
        const tokenNorm = tokenClean.replace(/[\s\-_]/g, '');

        let { data: exams } = await sb.from('Exams').select('*');
        exams = exams || [];

        let exam = exams.find(e => {
          const id = (e['ID Ujian'] || '').toString().trim().toUpperCase();
          const idNorm = id.replace(/[\s\-_]/g, '');
          const tok = (e['Token'] || '').toString().trim().toUpperCase();
          const tokNorm = tok.replace(/[\s\-_]/g, '');
          const jud = (e['Judul Ujian'] || '').toString().trim().toUpperCase();
          return id === tokenClean || idNorm === tokenNorm || (tok && (tok === tokenClean || tokNorm === tokenNorm)) || (jud && jud === tokenClean);
        });

        // Demo seed otomatis jika belum ada ujian
        if (!exam && (tokenNorm === 'EXM1234' || tokenNorm.startsWith('EXM') || exams.length === 0)) {
          const demoRes = await this.createExam({
            judulUjian: 'Penilaian Tengah Semester (PTS) Bersama',
            idMapel: 'MPL001',
            namaMapel: 'Ilmu Pengetahuan Alam',
            idKelas: 'KLS001',
            namaKelas: 'Kelas X-A',
            durasi: 60,
            tokenUjian: 'EXM1234',
            status: 'active',
            autoSeed: true,
            keterangan: 'Ujian evaluasi online'
          });
          if (demoRes.success) {
            const re = await sb.from('Exams').select('*').eq('ID Ujian', demoRes.id);
            exam = re.data && re.data[0];
          }
        }

        if (!exam) {
          return { success: false, message: 'Token atau ID Ujian tidak valid. Pastikan token sudah benar.' };
        }

        // Catat sesi pengerjaan ujian
        const newSessId = generateId('SES');
        const now = new Date().toISOString();
        await sb.from('ExamSessions').insert([{
          'ID Sesi': newSessId,
          'ID Ujian': exam['ID Ujian'],
          'Judul Ujian': exam['Judul Ujian'],
          'ID Kelas': exam['ID Kelas'] || '',
          'Nama Kelas': exam['Nama Kelas'] || '',
          'NIS Siswa': namaSiswa,
          'Nama Siswa': namaSiswa,
          'Status Sesi': 'in_progress',
          'Waktu Masuk': now,
          'Waktu Selesai': '',
          'Jawaban JSON': '{}',
          'Pelanggaran': 0,
          'IP Address': '',
          'User Agent': navigator.userAgent || ''
        }]);

        return {
          success: true,
          exam: exam,
          idSesi: newSessId
        };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async submitExamAnswers(examId, namaSiswa, nisSiswa, answersMap, statusOverride) {
      try {
        const sb = getClient();
        const { data: questions } = await sb.from('Questions').select('*').eq('ID Ujian', examId).order('Nomor Soal', { ascending: true });
        const { data: exams } = await sb.from('Exams').select('*').eq('ID Ujian', examId);
        const exam = exams && exams[0] ? exams[0] : {};

        let totalPG = 0;
        let benarPG = 0;
        let totalSoal = (questions || []).length;

        (questions || []).forEach((q, idx) => {
          const sIdx = String(idx);
          const studentAns = (answersMap && (answersMap[idx] !== undefined ? answersMap[idx] : answersMap[sIdx])) || '';
          let textAns = typeof studentAns === 'object' && studentAns ? (studentAns.text || '') : String(studentAns || '');

          if (q['Tipe Soal'] !== 'essay') {
            totalPG++;
            const correctAns = (q['Jawaban Benar'] || '').trim().toUpperCase();
            if (textAns.trim().toUpperCase() === correctAns) {
              benarPG++;
            }
          }
        });

        const nilai = totalPG > 0 ? Math.round((benarPG / totalPG) * 100) : 100;
        const now = new Date().toISOString();
        const newGradeId = generateId('NLI');

        // Simpan nilai
        await sb.from('Grades').insert([{
          'ID Nilai': newGradeId,
          'ID Ujian': examId,
          'Judul Ujian': exam['Judul Ujian'] || '',
          'ID Mapel': exam['ID Mapel'] || '',
          'Nama Mapel': exam['Nama Mapel'] || '',
          'ID Kelas': exam['ID Kelas'] || '',
          'Nama Kelas': exam['Nama Kelas'] || '',
          'NIS Siswa': nisSiswa || namaSiswa,
          'Nama Siswa': namaSiswa,
          'Nilai': nilai,
          'Jumlah Benar': benarPG,
          'Jumlah Salah': totalPG - benarPG,
          'Total Soal': totalSoal,
          'Waktu Mulai': now,
          'Waktu Selesai': now,
          'Durasi Mengerjakan': '',
          'ID Guru': exam['ID Guru'] || '',
          'Nama Guru': exam['Nama Guru'] || '',
          'Catatan Guru': '',
          'Nilai Akhir': nilai,
          'Tanggal Input': now,
          'Status': statusOverride || 'selesai'
        }]);

        // Update sesi ujian
        await sb.from('ExamSessions').update({
          'Status Sesi': statusOverride || 'completed',
          'Waktu Selesai': now,
          'Jawaban JSON': JSON.stringify(answersMap || {})
        }).eq('ID Ujian', examId).eq('NIS Siswa', nisSiswa || namaSiswa);

        return {
          success: true,
          message: 'Jawaban ujian berhasil dikumpulkan!',
          nilai: nilai,
          benar: benarPG,
          total: totalSoal
        };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async logViolation(payload) {
      try {
        const sb = getClient();
        const newId = generateId('VLT');
        const now = new Date().toISOString();
        await sb.from('Violations').insert([{
          'ID': newId,
          'ID Ujian': payload.idUjian || '',
          'Judul Ujian': payload.judulUjian || '',
          'ID Kelas': payload.idKelas || '',
          'Nama Kelas': payload.namaKelas || '',
          'NIS Siswa': payload.nisSiswa || '',
          'Nama Siswa': payload.namaSiswa || '',
          'Jenis Pelanggaran': payload.jenisViolation || payload.jenisPelanggaran || 'Pindah Layar',
          'Waktu Pelanggaran': now,
          'Detail': payload.detail || '',
          'Jumlah Pelanggaran': 1
        }]);
        return { success: true };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async disqualifyExamSession(idSesi, reason) {
      try {
        const sb = getClient();
        await sb.from('ExamSessions').update({
          'Status Sesi': 'disqualified'
        }).eq('ID Sesi', idSesi);
        return { success: true, message: 'Sesi ujian telah didiskualifikasi.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getExamSessions(examId) {
      const sb = getClient();
      const { data } = await sb.from('ExamSessions').select('*').eq('ID Ujian', examId);
      return data || [];
    },

    async getExamSubmissionsForTeacher(examId) {
      try {
        const sb = getClient();
        const [sessRes, gradeRes] = await Promise.all([
          sb.from('ExamSessions').select('*').eq('ID Ujian', examId),
          sb.from('Grades').select('*').eq('ID Ujian', examId)
        ]);

        const sessions = sessRes.data || [];
        const grades = gradeRes.data || [];

        const results = sessions.map(s => {
          const sNis = (s['NIS Siswa'] || '').toLowerCase();
          const sNama = (s['Nama Siswa'] || '').toLowerCase();
          const g = grades.find(item => {
            const gNis = (item['NIS Siswa'] || '').toLowerCase();
            const gNama = (item['Nama Siswa'] || '').toLowerCase();
            return (sNis && gNis === sNis) || (sNama && gNama === sNama);
          });
          return {
            ...s,
            gradeData: g || null,
            nilai: g ? g['Nilai'] : '-'
          };
        });

        return { success: true, data: results };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getStudentAnswerSheet(examId, nisSiswa, namaSiswa, idSesi) {
      try {
        const sb = getClient();
        let query = sb.from('ExamSessions').select('*').eq('ID Ujian', examId);
        if (idSesi) query = query.eq('ID Sesi', idSesi);
        const { data: sessList } = await query;

        const session = sessList && sessList[0] ? sessList[0] : null;
        let answersMap = {};
        if (session && session['Jawaban JSON']) {
          try { answersMap = JSON.parse(session['Jawaban JSON']); } catch (e) { }
        }

        const { data: questions } = await sb.from('Questions').select('*').eq('ID Ujian', examId).order('Nomor Soal', { ascending: true });
        return {
          success: true,
          session: session,
          questions: questions || [],
          answers: answersMap
        };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteStudentExamSubmission(idSesi, examId, nisSiswa) {
      try {
        const sb = getClient();
        if (idSesi) await sb.from('ExamSessions').delete().eq('ID Sesi', idSesi);
        if (examId && nisSiswa) {
          await sb.from('Grades').delete().eq('ID Ujian', examId).eq('NIS Siswa', nisSiswa);
        }
        return { success: true, message: 'Submisi siswa berhasil direset.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- GRADES (REKAP NILAI) ---
    async getGrades(examId) {
      const sb = getClient();
      let query = sb.from('Grades').select('*');
      if (examId) query = query.eq('ID Ujian', examId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    async saveGrade(data) {
      try {
        const sb = getClient();
        const newId = generateId('NLI');
        const now = new Date().toISOString();
        const { error } = await sb.from('Grades').insert([{
          'ID Nilai': newId,
          'ID Ujian': data.idUjian,
          'Judul Ujian': data.judulUjian,
          'ID Mapel': data.idMapel || '',
          'Nama Mapel': data.namaMapel || '',
          'ID Kelas': data.idKelas || '',
          'Nama Kelas': data.namaKelas || '',
          'NIS Siswa': data.nisSiswa,
          'Nama Siswa': data.namaSiswa,
          'Nilai': Number(data.nilai || 0),
          'Jumlah Benar': Number(data.jumlahBenar || 0),
          'Jumlah Salah': Number(data.jumlahSalah || 0),
          'Total Soal': Number(data.totalSoal || 0),
          'Waktu Mulai': now,
          'Waktu Selesai': now,
          'Durasi Mengerjakan': data.durasi || '',
          'ID Guru': data.idGuru || '',
          'Nama Guru': data.namaGuru || '',
          'Catatan Guru': data.catatanGuru || '',
          'Nilai Akhir': Number(data.nilaiAkhir ?? data.nilai ?? 0),
          'Tanggal Input': now,
          'Status': data.status || 'selesai'
        }]);
        if (error) throw error;
        return { success: true, message: 'Nilai berhasil disimpan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateGrade(id, data) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Grades').update({
          'Nilai': Number(data.nilai),
          'Nilai Akhir': Number(data.nilaiAkhir ?? data.nilai),
          'Catatan Guru': data.catatanGuru,
          'Status': data.status
        }).eq('ID Nilai', id);
        if (error) throw error;
        return { success: true, message: 'Nilai berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteGrade(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Grades').delete().eq('ID Nilai', id);
        if (error) throw error;
        return { success: true, message: 'Nilai berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async setGradeStatusFinish(id) {
      try {
        const sb = getClient();
        await sb.from('Grades').update({ 'Status': 'selesai' }).eq('ID Nilai', id);
        return { success: true, message: 'Status nilai berhasil diubah menjadi selesai.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- ANNOUNCEMENTS (PENGUMUMAN) ---
    async getAnnouncements() {
      const sb = getClient();
      const { data, error } = await sb.from('Announcements').select('*').eq('Status', 'active');
      return { success: !error, data: data || [] };
    },

    async getAllAnnouncements() {
      const sb = getClient();
      const { data, error } = await sb.from('Announcements').select('*');
      return { success: !error, data: data || [] };
    },

    async createAnnouncement(data) {
      try {
        const sb = getClient();
        const newId = generateId('ANN');
        const now = new Date().toISOString();
        const { error } = await sb.from('Announcements').insert([{
          'ID': newId,
          'Judul': data.judul,
          'Konten': data.konten,
          'Kategori': data.kategori || 'Umum',
          'Prioritas': data.prioritas || 'Normal',
          'ID Pembuat': data.idPembuat || '',
          'Nama Pembuat': data.namaPembuat || 'Admin',
          'Role Pembuat': data.rolePembuat || 'admin',
          'Tanggal Buat': now,
          'Tanggal Update': now,
          'Status': data.status || 'active',
          'Gambar URL': data.gambarUrl || ''
        }]);
        if (error) throw error;
        return { success: true, message: 'Pengumuman berhasil dipublikasikan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateAnnouncement(id, data) {
      try {
        const sb = getClient();
        const now = new Date().toISOString();
        const { error } = await sb.from('Announcements').update({
          'Judul': data.judul,
          'Konten': data.konten,
          'Kategori': data.kategori,
          'Prioritas': data.prioritas,
          'Status': data.status,
          'Gambar URL': data.gambarUrl,
          'Tanggal Update': now
        }).eq('ID', id);
        if (error) throw error;
        return { success: true, message: 'Pengumuman berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteAnnouncement(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Announcements').delete().eq('ID', id);
        if (error) throw error;
        return { success: true, message: 'Pengumuman berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- ATTENDANCE (ABSENSI) ---
    async saveAttendance(attendanceList) {
      try {
        const sb = getClient();
        const now = new Date();
        const jamAbsen = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const rows = (attendanceList || []).map(item => ({
          'ID Absen': generateId('ABS'),
          'Tanggal': item.tanggal,
          'Hari': getDayName(item.tanggal),
          'ID Kelas': item.idKelas,
          'Nama Kelas': item.namaKelas,
          'ID Guru': item.idGuru || '',
          'Nama Guru': item.namaGuru || '',
          'ID Mapel': item.idMapel || '',
          'Nama Mapel': item.namaMapel || '',
          'NIS Siswa': item.nisSiswa,
          'Nama Siswa': item.namaSiswa,
          'Status': item.status,
          'Keterangan': item.keterangan || '',
          'Jam Absen': jamAbsen,
          'Diubah Oleh': item.idGuru || '',
          'Waktu Ubah': now.toISOString()
        }));

        const { error } = await sb.from('Attendance').insert(rows);
        if (error) throw error;
        return { success: true, message: 'Absensi berhasil disimpan.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getAttendanceHistory(filter) {
      try {
        const sb = getClient();
        let query = sb.from('Attendance').select('*');
        if (filter.idKelas) query = query.eq('ID Kelas', filter.idKelas);
        if (filter.tanggal) query = query.eq('Tanggal', filter.tanggal);
        if (filter.idGuru) query = query.eq('ID Guru', filter.idGuru);
        const { data, error } = await query;
        return { success: !error, data: data || [] };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getAllAttendanceForPrint(classId, startDate, endDate) {
      try {
        const sb = getClient();
        let query = sb.from('Attendance').select('*');
        if (classId) query = query.eq('ID Kelas', classId);
        if (startDate) query = query.gte('Tanggal', startDate);
        if (endDate) query = query.lte('Tanggal', endDate);
        const { data, error } = await query;
        return { success: !error, data: data || [] };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateAttendanceRecord(id, updateData) {
      try {
        const sb = getClient();
        const now = new Date().toISOString();
        const { error } = await sb.from('Attendance').update({
          'Status': updateData.status,
          'Keterangan': updateData.keterangan || '',
          'Waktu Ubah': now
        }).eq('ID Absen', id);
        if (error) throw error;
        return { success: true, message: 'Absensi berhasil diperbarui.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteAttendanceRecord(id) {
      try {
        const sb = getClient();
        const { error } = await sb.from('Attendance').delete().eq('ID Absen', id);
        if (error) throw error;
        return { success: true, message: 'Absensi berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    // --- VIOLATIONS (PELANGGARAN UJIAN) ---
    async getViolations(examId) {
      const sb = getClient();
      let query = sb.from('Violations').select('*');
      if (examId) query = query.eq('ID Ujian', examId);
      const { data, error } = await query;
      return { success: !error, data: data || [] };
    },

    // --- RUANG PEMBELAJARAN (LEARNING ROOM) ---
    _normalizeLearning(item) {
      if (!item || typeof item !== 'object') return item;
      let atts = item.attachments || item['Attachments'] || [];
      if (typeof atts === 'string') {
        try { atts = JSON.parse(atts); } catch (e) { atts = []; }
      }
      if (!Array.isArray(atts)) atts = [];

      return {
        id: item.id || item['ID'] || '',
        judul: item.judul || item['Judul'] || 'Materi Pembelajaran',
        idMapel: item.idMapel || item['ID Mapel'] || '',
        namaMapel: item.namaMapel || item['Nama Mapel'] || 'Umum',
        idKelas: item.idKelas || item['ID Kelas'] || '',
        namaKelas: item.namaKelas || item['Nama Kelas'] || 'Semua Kelas',
        idGuru: item.idGuru || item['ID Guru'] || '',
        namaGuru: item.namaGuru || item['Nama Guru'] || 'Guru Pengampu',
        token: (item.token || item['Token'] || '').trim().toUpperCase(),
        ringkasan: item.ringkasan || item['Ringkasan'] || '',
        konten: item.konten || item['Konten'] || '',
        mediaUrl: item.mediaUrl || item['Media URL'] || item.media_url || '',
        attachments: atts,
        status: (item.status || item['Status'] || 'active').toLowerCase(),
        tanggalBuat: item.tanggalBuat || item['Tanggal Buat'] || item.created_at || new Date().toISOString()
      };
    },

    async _loadLearningsStore() {
      const sb = getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('Learnings').select('*').order('Tanggal Buat', { ascending: false });
          if (!error && Array.isArray(data) && data.length > 0) {
            return data.map(it => this._normalizeLearning(it));
          }
        } catch (e) { }
        try {
          const { data, error } = await sb.from('Settings').select('Value').eq('Key', 'app_learnings_data').maybeSingle();
          if (!error && data && data.Value) {
            const parsed = JSON.parse(data.Value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map(it => this._normalizeLearning(it));
            }
          }
        } catch (e) { }
      }
      try {
        const local = localStorage.getItem('portal_learnings_data');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(it => this._normalizeLearning(it));
          }
        }
      } catch (e) { }

      // Default sample learning jika belum ada data sama sekali
      const defaultList = [
        {
          id: 'LRN-BIO-01',
          judul: 'Konsep Ekosistem & Keanekaragaman Hayati',
          idMapel: '',
          namaMapel: 'Biologi',
          idKelas: '',
          namaKelas: 'Semua Kelas',
          idGuru: '',
          namaGuru: 'Guru Pengampu Biologi',
          token: 'BIO10',
          ringkasan: 'Pelajari komponen biotik, abiotik, piramida energi, dan aliran rantai makanan di lingkungan sekitar.',
          konten: 'Ekosistem tersusun atas komponen biotik (produsen, konsumen, pengurai) dan komponen abiotik (tanah, air, suhu, sinar matahari).\n\n1. Tingkat Trofik 1: Produsen (tanaman hijau)\n2. Tingkat Trofik 2: Konsumen Primer (herbivora)\n3. Tingkat Trofik 3: Konsumen Sekunder (karnivora)\n4. Pengurai: Bakteri dan jamur saprofit\n\nSilakan simak modul di atas, unduh berkas yang dilampirkan, serta sampaikan pertanyaan atau masukan Anda di kolom diskusi di bawah!',
          mediaUrl: 'https://www.youtube.com/watch?v=kYJv4j52y4M',
          attachments: [],
          status: 'active',
          tanggalBuat: new Date().toISOString()
        }
      ];
      try {
        localStorage.setItem('portal_learnings_data', JSON.stringify(defaultList));
      } catch (e) { }
      return defaultList.map(it => this._normalizeLearning(it));
    },

    async _saveLearningsStore(list) {
      const normalized = (list || []).map(it => this._normalizeLearning(it));
      const sb = getClient();
      if (sb) {
        try {
          await sb.from('Settings').upsert([{
            'Key': 'app_learnings_data',
            'Value': JSON.stringify(normalized),
            'Label': 'Data Ruang Pembelajaran',
            'Keterangan': 'Sync modul ruang pembelajaran mandiri',
            'Diupdate': new Date().toISOString()
          }]);
        } catch (e) { }
      }
      try {
        localStorage.setItem('portal_learnings_data', JSON.stringify(normalized));
      } catch (e) { }
    },

    async getLearnings(filterGuruId) {
      try {
        const list = await this._loadLearningsStore();
        let result = list;
        if (filterGuruId) {
          const fStr = String(filterGuruId).trim().toLowerCase();
          result = list.filter(item => {
            const matchId = item.idGuru && String(item.idGuru).trim().toLowerCase() === fStr;
            const matchName = item.namaGuru && String(item.namaGuru).trim().toLowerCase() === fStr;
            return matchId || matchName;
          });
        }
        return { success: true, data: result };
      } catch (e) {
        return { success: false, message: e.message, data: [] };
      }
    },

    async createLearning(data) {
      try {
        const list = await this._loadLearningsStore();
        const newId = generateId('LRN');
        const token = (data.token || ('LRN' + Math.random().toString(36).substr(2, 4)).toUpperCase()).trim().toUpperCase();

        const newItem = {
          id: newId,
          judul: data.judul || 'Materi Pembelajaran Baru',
          idMapel: data.idMapel || '',
          namaMapel: data.namaMapel || '',
          idKelas: data.idKelas || '',
          namaKelas: data.namaKelas || 'Semua Kelas',
          idGuru: data.idGuru || '',
          namaGuru: data.namaGuru || 'Guru Pengampu',
          token: token,
          ringkasan: data.ringkasan || '',
          konten: data.konten || '',
          mediaUrl: data.mediaUrl || '',
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          status: data.status || 'active',
          tanggalBuat: new Date().toISOString()
        };

        list.unshift(newItem);
        await this._saveLearningsStore(list);
        return { success: true, message: 'Pembelajaran berhasil dipublikasikan!', data: newItem };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateLearning(id, data) {
      try {
        const list = await this._loadLearningsStore();
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return { success: false, message: 'Data pembelajaran tidak ditemukan.' };

        list[idx] = {
          ...list[idx],
          judul: data.judul !== undefined ? data.judul : list[idx].judul,
          idMapel: data.idMapel !== undefined ? data.idMapel : list[idx].idMapel,
          namaMapel: data.namaMapel !== undefined ? data.namaMapel : list[idx].namaMapel,
          idKelas: data.idKelas !== undefined ? data.idKelas : list[idx].idKelas,
          namaKelas: data.namaKelas !== undefined ? data.namaKelas : list[idx].namaKelas,
          token: data.token ? data.token.trim().toUpperCase() : list[idx].token,
          ringkasan: data.ringkasan !== undefined ? data.ringkasan : list[idx].ringkasan,
          konten: data.konten !== undefined ? data.konten : list[idx].konten,
          mediaUrl: data.mediaUrl !== undefined ? data.mediaUrl : list[idx].mediaUrl,
          attachments: data.attachments !== undefined ? data.attachments : (list[idx].attachments || []),
          status: data.status !== undefined ? data.status : list[idx].status,
          tanggalUpdate: new Date().toISOString()
        };

        await this._saveLearningsStore(list);
        return { success: true, message: 'Pembelajaran berhasil diperbarui!' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteLearning(id) {
      try {
        let list = await this._loadLearningsStore();
        list = list.filter(item => item.id !== id);
        await this._saveLearningsStore(list);
        return { success: true, message: 'Pembelajaran berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async validateAndJoinLearning(namaSiswa, tokenInput) {
      try {
        if (!namaSiswa || !tokenInput) {
          return { success: false, message: 'Nama lengkap siswa dan token wajib diisi!' };
        }
        const cleanTok = tokenInput.trim().toUpperCase();
        const list = await this._loadLearningsStore();
        const match = list.find(item => {
          const itemTok = (item.token || item['Token'] || '').trim().toUpperCase();
          const itemId = (item.id || item['ID'] || '').trim().toUpperCase();
          const status = (item.status || item['Status'] || 'active').toLowerCase();
          return (itemTok === cleanTok || itemId === cleanTok) && status !== 'inactive';
        });

        if (!match) {
          return { success: false, message: 'Token Pembelajaran tidak valid atau materi sudah tidak aktif!' };
        }

        const normalizedMatch = this._normalizeLearning(match);

        // Catat kehadiran siswa (status aktif)
        const attendees = await this._loadLearningAttendeesStore();
        const now = new Date().toISOString();
        const attId = generateId('ATT');
        attendees.unshift({
          id: attId,
          idPembelajaran: normalizedMatch.id,
          judulPembelajaran: normalizedMatch.judul,
          namaSiswa: namaSiswa.trim(),
          waktuMasuk: now,
          waktuAkses: now,
          waktuKeluar: null,
          status: 'active'
        });
        await this._saveLearningAttendeesStore(attendees);

        return {
          success: true,
          message: 'Berhasil bergabung!',
          learning: normalizedMatch,
          namaSiswa: namaSiswa.trim(),
          waktuMasuk: now,
          attendeeId: attId
        };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async recordLearningExit(attendeeId, learningId, namaSiswa) {
      try {
        const attendees = await this._loadLearningAttendeesStore();
        const now = new Date().toISOString();
        let updated = false;
        for (let a of attendees) {
          if ((attendeeId && a.id === attendeeId) || (!attendeeId && a.idPembelajaran === learningId && a.namaSiswa === namaSiswa && a.status === 'active')) {
            a.waktuKeluar = now;
            a.status = 'selesai';
            updated = true;
            break;
          }
        }
        if (updated) {
          await this._saveLearningAttendeesStore(attendees);
        }
        return { success: true, message: 'Kehadiran sesi belajar selesai dicatat' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async getLearningAttendees(learningId) {
      try {
        const attendees = await this._loadLearningAttendeesStore();
        const filtered = learningId ? attendees.filter(a => a.idPembelajaran === learningId) : attendees;
        return { success: true, data: filtered };
      } catch (e) {
        return { success: false, message: e.message, data: [] };
      }
    },

    async _loadLearningAttendeesStore() {
      const sb = getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('Settings').select('Value').eq('Key', 'app_learning_attendees_data').maybeSingle();
          if (!error && data && data.Value) {
            const parsed = JSON.parse(data.Value);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (e) { }
      }
      try {
        const local = localStorage.getItem('portal_learning_attendees_data');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { }
      const defaultAttendees = [
        {
          id: 'ATT-DEMO-01',
          idPembelajaran: 'LRN-BIO-01',
          judulPembelajaran: 'Konsep Ekosistem & Keanekaragaman Hayati',
          namaSiswa: 'Ahmad Siswa',
          waktuMasuk: new Date(Date.now() - 2400000).toISOString(),
          waktuKeluar: null,
          status: 'active'
        },
        {
          id: 'ATT-DEMO-02',
          idPembelajaran: 'LRN-BIO-01',
          judulPembelajaran: 'Konsep Ekosistem & Keanekaragaman Hayati',
          namaSiswa: 'Siti Nurhaliza',
          waktuMasuk: new Date(Date.now() - 5400000).toISOString(),
          waktuKeluar: new Date(Date.now() - 3600000).toISOString(),
          status: 'selesai'
        }
      ];
      try {
        localStorage.setItem('portal_learning_attendees_data', JSON.stringify(defaultAttendees));
      } catch (e) { }
      return defaultAttendees;
    },

    async _saveLearningAttendeesStore(list) {
      const sb = getClient();
      if (sb) {
        try {
          await sb.from('Settings').upsert([{
            'Key': 'app_learning_attendees_data',
            'Value': JSON.stringify(list),
            'Label': 'Data Hadir Ruang Belajar',
            'Keterangan': 'Sync riwayat siswa masuk & keluar ruang pembelajaran',
            'Diupdate': new Date().toISOString()
          }]);
        } catch (e) { }
      }
      try {
        localStorage.setItem('portal_learning_attendees_data', JSON.stringify(list));
      } catch (e) { }
    },

    // ── FORUM DISKUSI INTERAKTIF RUANG PEMBELAJARAN ──
    async getLearningDiscussions(learningId) {
      try {
        const all = await this._loadLearningDiscussionsStore();
        const filtered = learningId ? all.filter(d => d.idPembelajaran === learningId) : all;
        return { success: true, data: filtered };
      } catch (e) {
        return { success: false, message: e.message, data: [] };
      }
    },

    async postLearningComment(learningId, commentData) {
      try {
        if (!commentData || !commentData.content || !commentData.content.trim()) {
          return { success: false, message: 'Isi pertanyaan atau komentar wajib diisi!' };
        }
        const all = await this._loadLearningDiscussionsStore();
        const newComment = {
          id: generateId('DSC'),
          idPembelajaran: learningId,
          senderName: (commentData.senderName || 'Anonim').trim(),
          senderRole: commentData.senderRole || 'siswa', // 'siswa' atau 'guru'
          category: commentData.category || 'pertanyaan', // 'pertanyaan', 'saran', 'diskusi'
          content: commentData.content.trim(),
          parentId: commentData.parentId || null,
          createdAt: new Date().toISOString()
        };
        all.push(newComment);
        await this._saveLearningDiscussionsStore(all);
        return { success: true, message: 'Pesan berhasil dikirim ke forum diskusi!', data: newComment };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteLearningComment(learningId, commentId) {
      try {
        let all = await this._loadLearningDiscussionsStore();
        all = all.filter(c => c.id !== commentId && c.parentId !== commentId);
        await this._saveLearningDiscussionsStore(all);
        return { success: true, message: 'Komentar diskusi berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async _loadLearningDiscussionsStore() {
      const sb = getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('Settings').select('Value').eq('Key', 'app_learning_discussions_data').maybeSingle();
          if (!error && data && data.Value) {
            const parsed = JSON.parse(data.Value);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) { }
      }
      try {
        const local = localStorage.getItem('portal_learning_discussions_data');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { }

      const defaultDiscussions = [
        {
          id: 'DSC-001',
          idPembelajaran: 'LRN-BIO-01',
          senderName: 'Ahmad Siswa',
          senderRole: 'siswa',
          category: 'pertanyaan',
          content: 'Izin bertanya Bu/Pak Guru, apa perbedaan utama dekomposer dengan detritivor pada ekosistem?',
          parentId: null,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'DSC-002',
          idPembelajaran: 'LRN-BIO-01',
          senderName: 'Guru Pengampu Biologi',
          senderRole: 'guru',
          category: 'jawaban',
          content: 'Pertanyaan bagus Ahmad! Dekomposer menguraikan sisa organik secara enzimatik/kimiawi (contoh bakteri & jamur), sedangkan detritivor memakan hancuran materi organik secara fisik (contoh cacing tanah & rayap).',
          parentId: 'DSC-001',
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'DSC-003',
          idPembelajaran: 'LRN-BIO-01',
          senderName: 'Siti Nurhaliza',
          senderRole: 'siswa',
          category: 'saran',
          content: 'Saran untuk pertemuan berikutnya bisa ditambahkan video simulasi interaktif jaring-jaring makanan laut pak/bu.',
          parentId: null,
          createdAt: new Date(Date.now() - 900000).toISOString()
        }
      ];
      try {
        localStorage.setItem('portal_learning_discussions_data', JSON.stringify(defaultDiscussions));
      } catch (e) { }
      return defaultDiscussions;
    },

    async _saveLearningDiscussionsStore(list) {
      const sb = getClient();
      if (sb) {
        try {
          await sb.from('Settings').upsert([{
            'Key': 'app_learning_discussions_data',
            'Value': JSON.stringify(list),
            'Label': 'Data Diskusi Ruang Pembelajaran',
            'Keterangan': 'Sync forum tanya jawab & saran materi pembelajaran',
            'Diupdate': new Date().toISOString()
          }]);
        } catch (e) { }
      }
      try {
        localStorage.setItem('portal_learning_discussions_data', JSON.stringify(list));
      } catch (e) { }
    },

    // ══════════════════════════════════════════════════════════════════
    // SPMB (SISTEM PENERIMAAN MURID BARU) HANDLERS
    // ══════════════════════════════════════════════════════════════════
    async _loadSpmbStore() {
      const sb = getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('Settings').select('Value').eq('Key', 'app_spmb_registrations').maybeSingle();
          if (!error && data && data.Value) {
            const parsed = JSON.parse(data.Value);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) { }
      }
      try {
        const local = localStorage.getItem('portal_spmb_registrations');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { }

      // Default sample pendaftar jika baru pertama kali dibuka
      const defaultSpmb = [
        {
          id: 'SPMB-2026-0001',
          nomorPendaftaran: 'SPMB/2026/0001',
          tanggalDaftar: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: 'menunggu', // 'menunggu', 'diterima', 'revisi', 'ditolak'
          catatanPetugas: 'Menunggu kelengkapan verifikasi berkas',
          // 1. Data Akun & Registrasi Awal
          nisn: '0089123456',
          nik: '7403011205080001',
          namaLengkap: 'Muh. Fadhil Ramadhan',
          tempatLahir: 'Tondasi',
          tanggalLahir: '2008-05-12',
          asalSekolah: 'SMP Negeri 1 Barangka',
          jenjangAsal: 'SMP',
          tahunLulus: '2026',
          jalurPendaftaran: 'Zonasi/Domisili',
          // 2. Biodata Calon Siswa & Orang Tua
          jenisKelamin: 'Laki-laki',
          agama: 'Islam',
          namaIbuKandung: 'Wa Ode Rosmawati',
          nomorKk: '7403011205080005',
          namaAyahWali: 'La Ode Baharuddin',
          teleponOrtu: '081234567890',
          pekerjaanOrtu: 'Wiraswasta/Pedagang',
          kebutuhanKhusus: 'Tidak Ada',
          // 3. Data Alamat & Titik Domisili
          provinsi: 'Sulawesi Tenggara',
          kabupaten: 'Muna Barat',
          kecamatan: 'Barangka',
          desaKelurahan: 'Lawa',
          rtRw: '002/001',
          kodePos: '93653',
          alamatLengkap: 'Jl. Poros Barangka RT 02 RW 01, Muna Barat',
          titikKoordinat: '-4.842105, 122.458912',
          fotoRumah: '',
          // 4. Data Akademik & Nilai Rapor
          nilaiRataRata: '87.50',
          detailNilai: {
            mtk: [85, 88, 86, 90, 89],
            ind: [88, 86, 89, 87, 90],
            ing: [84, 85, 86, 88, 87],
            ipa: [86, 87, 88, 89, 90]
          },
          // 5. Dokumen Persyaratan
          dokumen: {
            pasFoto: '',
            kk: '',
            akta: '',
            ijazahSkl: '',
            rapor: '',
            ktpOrtu: '',
            sptjm: '',
            jalurKhusus: ''
          }
        }
      ];
      try {
        localStorage.setItem('portal_spmb_registrations', JSON.stringify(defaultSpmb));
      } catch (e) { }
      return defaultSpmb;
    },

    async _saveSpmbStore(list) {
      const sb = getClient();
      if (sb) {
        try {
          await sb.from('Settings').upsert([{
            'Key': 'app_spmb_registrations',
            'Value': JSON.stringify(list),
            'Label': 'Data SPMB Pendaftar Baru',
            'Keterangan': 'Sync data pendaftaran penerimaan murid baru online',
            'Diupdate': new Date().toISOString()
          }]);
        } catch (e) { }
      }
      try {
        localStorage.setItem('portal_spmb_registrations', JSON.stringify(list));
      } catch (e) { }
    },

    async getSpmbList(filterStatus, filterJalur) {
      try {
        let list = await this._loadSpmbStore();
        if (filterStatus && filterStatus !== 'all') {
          list = list.filter(item => (item.status || 'menunggu').toLowerCase() === filterStatus.toLowerCase());
        }
        if (filterJalur && filterJalur !== 'all') {
          list = list.filter(item => (item.jalurPendaftaran || '').toLowerCase() === filterJalur.toLowerCase());
        }
        return { success: true, data: list };
      } catch (e) {
        return { success: false, message: e.message, data: [] };
      }
    },

    async getSpmbById(id) {
      try {
        const list = await this._loadSpmbStore();
        const found = list.find(item => item.id === id);
        if (!found) return { success: false, message: 'Data pendaftar tidak ditemukan.' };
        return { success: true, data: found };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async submitSpmbRegistration(data) {
      try {
        if (!data.namaLengkap || !data.nisn) {
          return { success: false, message: 'Nama lengkap dan NISN calon siswa wajib diisi!' };
        }
        const list = await this._loadSpmbStore();

        // Cek apakah NISN sudah terdaftar
        const existing = list.find(item => item.nisn === data.nisn.trim());
        if (existing) {
          return {
            success: false,
            message: 'NISN ' + data.nisn + ' sudah pernah didaftarkan pada nomor registrasi ' + (existing.nomorPendaftaran || existing.id) + '!'
          };
        }

        const nextNum = list.length + 1;
        const regCode = 'SPMB-2026-' + String(nextNum).padStart(4, '0');
        const regNomor = 'SPMB/2026/' + String(nextNum).padStart(4, '0');

        const newApplicant = {
          id: regCode,
          nomorPendaftaran: regNomor,
          tanggalDaftar: new Date().toISOString(),
          status: 'menunggu',
          catatanPetugas: 'Pendaftaran baru diterima, menunggu verifikasi berkas.',
          verifikator: '',
          // 1. Data Akun & Registrasi Awal
          nisn: (data.nisn || '').trim(),
          nik: (data.nik || '').trim(),
          namaLengkap: (data.namaLengkap || '').trim(),
          tempatLahir: (data.tempatLahir || '').trim(),
          tanggalLahir: (data.tanggalLahir || '').trim(),
          asalSekolah: (data.asalSekolah || '').trim(),
          jenjangAsal: (data.jenjangAsal || 'SMP').trim(),
          tahunLulus: (data.tahunLulus || '2026').trim(),
          jalurPendaftaran: (data.jalurPendaftaran || 'Zonasi/Domisili').trim(),
          // 2. Biodata Calon Siswa & Orang Tua
          jenisKelamin: (data.jenisKelamin || 'Laki-laki').trim(),
          agama: (data.agama || 'Islam').trim(),
          namaIbuKandung: (data.namaIbuKandung || '').trim(),
          nomorKk: (data.nomorKk || '').trim(),
          namaAyahWali: (data.namaAyahWali || '').trim(),
          teleponOrtu: (data.teleponOrtu || '').trim(),
          pekerjaanOrtu: (data.pekerjaanOrtu || '').trim(),
          kebutuhanKhusus: (data.kebutuhanKhusus || 'Tidak Ada').trim(),
          // 3. Data Alamat & Titik Domisili
          provinsi: (data.provinsi || 'Sulawesi Tenggara').trim(),
          kabupaten: (data.kabupaten || 'Muna Barat').trim(),
          kecamatan: (data.kecamatan || '').trim(),
          desaKelurahan: (data.desaKelurahan || '').trim(),
          rtRw: (data.rtRw || '').trim(),
          kodePos: (data.kodePos || '').trim(),
          alamatLengkap: (data.alamatLengkap || '').trim(),
          titikKoordinat: (data.titikKoordinat || '').trim(),
          fotoRumah: data.fotoRumah || '',
          // 4. Data Akademik & Nilai Rapor
          nilaiRataRata: (data.nilaiRataRata || '0.00').trim(),
          detailNilai: data.detailNilai || {},
          // 5. Dokumen Persyaratan
          dokumen: data.dokumen || {}
        };

        list.unshift(newApplicant);
        await this._saveSpmbStore(list);
        return {
          success: true,
          message: 'Pendaftaran SPMB Berhasil Dikirim!',
          data: newApplicant
        };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateSpmbStatus(id, newStatus, catatan, verifikatorNama) {
      try {
        const list = await this._loadSpmbStore();
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return { success: false, message: 'Data pendaftar tidak ditemukan.' };

        list[idx].status = newStatus;
        if (catatan !== undefined) list[idx].catatanPetugas = catatan;
        if (verifikatorNama) list[idx].verifikator = verifikatorNama;
        list[idx].tanggalVerifikasi = new Date().toISOString();

        await this._saveSpmbStore(list);
        return { success: true, message: 'Status verifikasi pendaftaran berhasil diperbarui!' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async updateSpmbRegistration(id, updatedData) {
      try {
        const list = await this._loadSpmbStore();
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return { success: false, message: 'Data pendaftar tidak ditemukan.' };

        list[idx] = {
          ...list[idx],
          ...updatedData,
          id: list[idx].id,
          nomorPendaftaran: list[idx].nomorPendaftaran,
          tanggalUpdate: new Date().toISOString()
        };

        await this._saveSpmbStore(list);
        return { success: true, message: 'Data pendaftar SPMB berhasil diperbarui!' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async deleteSpmb(id) {
      try {
        let list = await this._loadSpmbStore();
        list = list.filter(item => item.id !== id);
        await this._saveSpmbStore(list);
        return { success: true, message: 'Data pendaftar berhasil dihapus.' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    },

    async checkSpmbStatus(nisnOrNoReg) {
      try {
        if (!nisnOrNoReg) return { success: false, message: 'Masukkan NISN atau Nomor Pendaftaran!' };
        const query = String(nisnOrNoReg).trim().toLowerCase();
        const list = await this._loadSpmbStore();
        const match = list.find(item => {
          return (item.nisn && item.nisn.toLowerCase() === query) ||
            (item.id && item.id.toLowerCase() === query) ||
            (item.nomorPendaftaran && item.nomorPendaftaran.toLowerCase() === query);
        });
        if (!match) {
          return { success: false, message: 'Data pendaftar dengan NISN / Nomor "' + nisnOrNoReg + '" tidak ditemukan.' };
        }
        return { success: true, data: match };
      } catch (e) {
        return { success: false, message: e.message };
      }
    }
  };

  // 3. PROXY SHIM UNTUK google.script.run
  // Mereplikasi pola sintaksis Google Apps Script:
  // google.script.run.withSuccessHandler(cb).withFailureHandler(cb).namaFungsi(arg1, arg2...)
  window.google = window.google || {};
  window.google.script = window.google.script || {};

  function createRunner() {
    let onSuccess = null;
    let onFailure = null;
    let userObj = null;

    const proxy = new Proxy({}, {
      get(target, prop) {
        if (prop === 'withSuccessHandler') {
          return function (fn) {
            onSuccess = fn;
            return proxy;
          };
        }
        if (prop === 'withFailureHandler') {
          return function (fn) {
            onFailure = fn;
            return proxy;
          };
        }
        if (prop === 'withUserObject') {
          return function (obj) {
            userObj = obj;
            return proxy;
          };
        }

        return async function (...args) {
          const successCb = onSuccess;
          const failureCb = onFailure;
          const uObj = userObj;

          try {
            let result;
            if (typeof Handlers[prop] === 'function') {
              result = await Handlers[prop](...args);
            } else {
              console.warn(`[Supabase Bridge] Handler "${prop}" belum terdaftar, mencoba fallback getAllData.`);
              result = await Handlers.getAllData(prop);
            }

            if (successCb) {
              try {
                successCb(result, uObj);
              } catch (cbErr) {
                console.error(`[Supabase Bridge] Error inside success handler of ${prop}:`, cbErr);
              }
            }
            return result;
          } catch (err) {
            console.error(`[Supabase Bridge Error] pada ${prop}:`, err);
            if (failureCb) {
              try {
                failureCb(err, uObj);
              } catch (cbErr) {
                console.error(`[Supabase Bridge] Error inside failure handler of ${prop}:`, cbErr);
              }
            }
          }
        };
      }
    });

    return proxy;
  }

  Object.defineProperty(window.google.script, 'run', {
    get() {
      return createRunner();
    },
    configurable: true,
    enumerable: true
  });

  console.log('✅ [Portal Sekolah] Supabase Bridge aktif dan siap melayani permintaan.');
})();
