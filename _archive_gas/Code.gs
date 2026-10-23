// ============================================================
// FILE: Code.gs
// DESKRIPSI: Backend utama Google Apps Script - semua fungsi
//            server-side untuk Portal Sekolah
// ============================================================

var _activeSpreadsheet = null;
function getActiveSs() {
  if (!_activeSpreadsheet) {
    _activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _activeSpreadsheet;
}

// ── doGet: Entry Point Web App ────────────────────────────────────────────────
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Portal Sekolah')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────
function getSheet(name) {
  return getActiveSs().getSheetByName(name);
}

function cleanDateBackend(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var h = String(d.getHours()).padStart(2, '0');
  var m = String(d.getMinutes()).padStart(2, '0');
  var s = String(d.getSeconds()).padStart(2, '0');
  if (y <= 1900) {
    return h + ':' + m;
  }
  var mon = String(d.getMonth() + 1).padStart(2, '0');
  var dt = String(d.getDate()).padStart(2, '0');
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return y + '-' + mon + '-' + dt;
  }
  return y + '-' + mon + '-' + dt + ' ' + h + ':' + m + (d.getSeconds() ? ':' + s : '');
}

function cleanTimezoneString(val) {
  if (val === undefined || val === null) return '';
  var s = String(val);
  if (s.indexOf('data:image') === 0 || s.indexOf('{') === 0 || s.indexOf('[') === 0) {
    return s;
  }
  return s
    .replace(/GMT[+-]\d{2,4}(\s*\([^)]*\))?/gi, '')
    .replace(/\b(WIB|WITA|WIT|UTC|GMT)\b/gi, '')
    .replace(/\s*\([A-Za-z\s]+(Time|Waktu|Standard)?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAllData(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var rawH = headers[j];
      var key = (rawH !== undefined && rawH !== null) ? rawH.toString().trim() : '';
      if (!key) continue;
      var cell = data[i][j];
      if (cell instanceof Date) {
        obj[key] = cleanDateBackend(cell);
      } else if (cell !== undefined && cell !== null) {
        obj[key] = cleanTimezoneString(cell.toString());
      } else {
        obj[key] = '';
      }
      if (obj[key] !== '') hasContent = true;
    }
    if (hasContent) {
      rows.push(obj);
    }
  }
  return rows;
}

function hashPasswordBackend(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + 'SALT_PORTAL_SEKOLAH_2024'
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function generateIdBackend(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substr(2, 4).toUpperCase();
}

function getDayName(dateStr) {
  var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var d = new Date(dateStr);
  return days[d.getDay()];
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function loginUser(username, password) {
  try {
    var sheet = getSheet('Users');
    var data = sheet.getDataRange().getValues();
    var hashedPw = hashPasswordBackend(password);
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === username && (data[i][2] === hashedPw || data[i][2] === password) && data[i][6] === 'active') {
        return {
          success: true,
          user: {
            id: data[i][0], username: data[i][1], namaLengkap: data[i][3],
            email: data[i][4], role: data[i][5], fotoProfil: data[i][7],
            nip: data[i][10], telepon: data[i][11], alamat: data[i][12]
          }
        };
      }
    }
    return { success: false, message: 'Username atau password salah, atau akun belum diaktifkan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function registerGuru(data) {
  try {
    var sheet = getSheet('PendingUsers');
    var usersSheet = getSheet('Users');
    var allUsers = usersSheet.getDataRange().getValues();
    var allPending = sheet.getDataRange().getValues();
    
    for (var i = 1; i < allUsers.length; i++) {
      if (allUsers[i][1] === data.username) return { success: false, message: 'Username sudah digunakan.' };
    }
    for (var i = 1; i < allPending.length; i++) {
      if (allPending[i][1] === data.username) return { success: false, message: 'Username sudah terdaftar, menunggu approval.' };
    }
    
    var newId = generateIdBackend('PND');
    var now = new Date().toISOString();
    sheet.appendRow([
      newId, data.username, data.password,
      data.namaLengkap, data.email, data.nip || '',
      data.telepon || '', data.alamat || '', 'pending', now, ''
    ]);
    return { success: true, message: 'Pendaftaran berhasil! Menunggu persetujuan admin.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── SETTINGS (Pengaturan Sekolah) ─────────────────────────────────────────────
function getSettings() {
  try {
    var data = getAllData('Settings');
    var settings = {};
    data.forEach(function(row) { settings[row['Key']] = row['Value']; });

    // Rekonstruksi gallery_images dari key individual (gallery_photo_0, gallery_photo_1, dst.)
    // Metode ini menghindari limit 48k karakter Sheets per sel
    try {
      var countVal = parseInt(settings['gallery_photo_count'] || '0', 10);
      if (countVal > 0) {
        var photos = [];
        for (var i = 0; i < countVal; i++) {
          var photoJson = settings['gallery_photo_' + i];
          if (photoJson) {
            try { photos.push(JSON.parse(photoJson)); } catch(je) {}
          }
        }
        if (photos.length >= 2) {
          settings['gallery_images'] = JSON.stringify(photos);
        }
      }
    } catch(ge) {}

    return { success: true, data: settings };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateSettings(settingsObj) {
  try {
    var sheet = getSheet('Settings');
    var data = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    
    for (var key in settingsObj) {
      var val = settingsObj[key];

      // gallery_images dipecah menjadi key individual per foto
      // agar setiap foto bisa disimpan tanpa batas total ukuran
      if (key === 'gallery_images') {
        try {
          var photoArr = typeof val === 'string' ? JSON.parse(val) : val;
          if (Array.isArray(photoArr)) {
            // Hapus key gallery_photo lama yang mungkin lebih banyak dari array baru
            var oldCount = 0;
            for (var si = 1; si < data.length; si++) {
              if (String(data[si][0]).indexOf('gallery_photo_') === 0) {
                var oldIdx = parseInt(String(data[si][0]).replace('gallery_photo_', ''), 10);
                if (!isNaN(oldIdx) && oldIdx > oldCount) oldCount = oldIdx;
              }
            }
            // Hapus slot yang tidak lagi diperlukan
            for (var di = oldCount; di >= photoArr.length; di--) {
              var delKey = 'gallery_photo_' + di;
              for (var ri = 1; ri < data.length; ri++) {
                if (data[ri][0] === delKey) {
                  sheet.getRange(ri + 1, 2).setValue('');
                  break;
                }
              }
            }
            // Simpan setiap foto sebagai key terpisah
            for (var pi = 0; pi < photoArr.length; pi++) {
              var photoKey = 'gallery_photo_' + pi;
              var photoVal = JSON.stringify(photoArr[pi]);
              var pfound = false;
              for (var psi = 1; psi < data.length; psi++) {
                if (data[psi][0] === photoKey) {
                  sheet.getRange(psi + 1, 2).setValue(photoVal);
                  sheet.getRange(psi + 1, 5).setValue(now);
                  pfound = true;
                  break;
                }
              }
              if (!pfound) {
                sheet.appendRow([photoKey, photoVal, 'Gallery Photo ' + pi, '', now]);
                data.push([photoKey, photoVal, '', '', now]);
              }
            }
            // Simpan jumlah foto
            var cntKey = 'gallery_photo_count';
            var cntVal = String(photoArr.length);
            var cfound = false;
            for (var csi = 1; csi < data.length; csi++) {
              if (data[csi][0] === cntKey) {
                sheet.getRange(csi + 1, 2).setValue(cntVal);
                sheet.getRange(csi + 1, 5).setValue(now);
                cfound = true;
                break;
              }
            }
            if (!cfound) { sheet.appendRow([cntKey, cntVal, 'Gallery Photo Count', '', now]); }
          }
        } catch(ge) {}
        continue; // Lewati penyimpanan key gallery_images ke Sheets (sudah disimpan per-foto)
      }

      if (typeof val === 'string' && val.length > 48000) {
        val = val.substring(0, 48000);
      }
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(val);
          sheet.getRange(i + 1, 5).setValue(now);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, val, key, '', now]);
        data.push([key, val, '', '', now]);
      }
    }
    return { success: true, message: 'Pengaturan berhasil disimpan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
function getAnnouncements() {
  try {
    var data = getAllData('Announcements');
    return { success: true, data: data.filter(function(r) { return r['Status'] === 'active'; }) };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getAllAnnouncements() {
  try {
    return { success: true, data: getAllData('Announcements') };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createAnnouncement(data) {
  try {
    var sheet = getSheet('Announcements');
    var now = new Date().toISOString();
    var newId = generateIdBackend('ANN');
    sheet.appendRow([
      newId, data.judul, data.konten, data.kategori || 'Umum',
      data.prioritas || 'Normal', data.idPembuat, data.namaPembuat,
      data.rolePembuat, now, now, 'active', data.gambarUrl || ''
    ]);
    return { success: true, message: 'Pengumuman berhasil dibuat.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateAnnouncement(id, data) {
  try {
    var sheet = getSheet('Announcements');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.getRange(i + 1, 2).setValue(data.judul);
        sheet.getRange(i + 1, 3).setValue(data.konten);
        sheet.getRange(i + 1, 4).setValue(data.kategori || rows[i][3]);
        sheet.getRange(i + 1, 5).setValue(data.prioritas || rows[i][4]);
        sheet.getRange(i + 1, 10).setValue(now);
        sheet.getRange(i + 1, 11).setValue(data.status || rows[i][10]);
        sheet.getRange(i + 1, 12).setValue(data.gambarUrl !== undefined ? data.gambarUrl : rows[i][11]);
        return { success: true, message: 'Pengumuman berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Pengumuman tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteAnnouncement(id) {
  try {
    var sheet = getSheet('Announcements');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Pengumuman berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Pengumuman tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── USERS MANAGEMENT ─────────────────────────────────────────────────────────
function getUsers() {
  try {
    var data = getAllData('Users');
    var filtered = data.filter(function(r) { return r['Role'] !== 'admin'; });
    return { success: true, data: filtered };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getAllUsers() {
  try {
    var data = getAllData('Users');
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getUserById(userId) {
  try {
    var data = getAllData('Users');
    var user = data.find(function(u) { return u['ID'] === userId; });
    if (user) {
      return { success: true, data: Object.assign({}, user) };
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function adminCreateUser(data) {
  try {
    var usersSheet = getSheet('Users');
    var allUsers = usersSheet.getDataRange().getValues();
    for (var i = 1; i < allUsers.length; i++) {
      if (allUsers[i][1] === data.username) return { success: false, message: 'Username sudah digunakan.' };
    }
    var newId = generateIdBackend('USR');
    var now = new Date().toISOString();
    usersSheet.appendRow([
      newId, data.username, data.password, data.namaLengkap,
      data.email || '', 'guru', 'active', data.fotoProfil || '',
      now, now, data.nip || '', data.telepon || '', data.alamat || ''
    ]);
    return { success: true, message: 'Guru berhasil ditambahkan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateUserProfile(userId, updateData) {
  try {
    var sheet = getSheet('Users');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        if (updateData.namaLengkap) sheet.getRange(i + 1, 4).setValue(updateData.namaLengkap);
        if (updateData.email) sheet.getRange(i + 1, 5).setValue(updateData.email);
        if (updateData.fotoProfil !== undefined) sheet.getRange(i + 1, 8).setValue(updateData.fotoProfil);
        if (updateData.nip) sheet.getRange(i + 1, 11).setValue(updateData.nip);
        if (updateData.telepon) sheet.getRange(i + 1, 12).setValue(updateData.telepon);
        if (updateData.alamat) sheet.getRange(i + 1, 13).setValue(updateData.alamat);
        return { success: true, message: 'Profil berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateUserPassword(userId, oldPassword, newPassword) {
  try {
    var sheet = getSheet('Users');
    var rows = sheet.getDataRange().getValues();
    var hashedOld = hashPasswordBackend(oldPassword);
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        if (rows[i][2] !== hashedOld && rows[i][2] !== oldPassword) return { success: false, message: 'Password lama tidak sesuai.' };
        sheet.getRange(i + 1, 3).setValue(newPassword);
        return { success: true, message: 'Password berhasil diubah.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateUsername(userId, newUsername, password) {
  try {
    var sheet = getSheet('Users');
    var rows = sheet.getDataRange().getValues();
    var hashedPw = hashPasswordBackend(password);
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === newUsername && rows[i][0] !== userId) {
        return { success: false, message: 'Username sudah digunakan oleh user lain.' };
      }
    }
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        if (rows[i][2] !== hashedPw && rows[i][2] !== password) return { success: false, message: 'Password tidak sesuai.' };
        sheet.getRange(i + 1, 2).setValue(newUsername);
        return { success: true, message: 'Username berhasil diubah.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function adminUpdateUser(userId, updateData) {
  try {
    var sheet = getSheet('Users');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        if (updateData.username) sheet.getRange(i + 1, 2).setValue(updateData.username);
        if (updateData.namaLengkap) sheet.getRange(i + 1, 4).setValue(updateData.namaLengkap);
        if (updateData.email) sheet.getRange(i + 1, 5).setValue(updateData.email);
        if (updateData.status) sheet.getRange(i + 1, 7).setValue(updateData.status);
        if (updateData.fotoProfil !== undefined) sheet.getRange(i + 1, 8).setValue(updateData.fotoProfil);
        if (updateData.nip !== undefined) sheet.getRange(i + 1, 11).setValue(updateData.nip);
        if (updateData.telepon !== undefined) sheet.getRange(i + 1, 12).setValue(updateData.telepon);
        if (updateData.alamat !== undefined) sheet.getRange(i + 1, 13).setValue(updateData.alamat);
        if (updateData.newPassword) sheet.getRange(i + 1, 3).setValue(updateData.newPassword);
        return { success: true, message: 'Data guru berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteUser(userId) {
  try {
    var sheet = getSheet('Users');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        if (rows[i][5] === 'admin') return { success: false, message: 'Tidak dapat menghapus akun admin.' };
        sheet.deleteRow(i + 1);
        return { success: true, message: 'User berhasil dihapus.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── PENDING USERS ─────────────────────────────────────────────────────────────
function getPendingUsers() {
  try {
    return { success: true, data: getAllData('PendingUsers') };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function approveUser(pendingId) {
  try {
    var pendingSheet = getSheet('PendingUsers');
    var usersSheet = getSheet('Users');
    var pendingData = pendingSheet.getDataRange().getValues();
    
    for (var i = 1; i < pendingData.length; i++) {
      if (pendingData[i][0] === pendingId) {
        var now = new Date().toISOString();
        var newId = generateIdBackend('USR');
        usersSheet.appendRow([
          newId, pendingData[i][1], pendingData[i][2],
          pendingData[i][3], pendingData[i][4], 'guru', 'active', '',
          pendingData[i][9], now, pendingData[i][5],
          pendingData[i][6], pendingData[i][7]
        ]);
        pendingSheet.deleteRow(i + 1);
        return { success: true, message: 'User berhasil diapprove.' };
      }
    }
    return { success: false, message: 'Pending user tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function rejectUser(pendingId, catatan) {
  try {
    var sheet = getSheet('PendingUsers');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === pendingId) {
        sheet.getRange(i + 1, 9).setValue('rejected');
        sheet.getRange(i + 1, 11).setValue(catatan || 'Ditolak oleh admin');
        return { success: true, message: 'User berhasil ditolak.' };
      }
    }
    return { success: false, message: 'Pending user tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deletePendingUser(pendingId) {
  try {
    var sheet = getSheet('PendingUsers');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === pendingId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── CLASSES ───────────────────────────────────────────────────────────────────
function getClasses() {
  try {
    return { success: true, data: getAllData('Classes') };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createClass(data) {
  try {
    var sheet = getSheet('Classes');
    var newId = generateIdBackend('KLS');
    sheet.appendRow([
      newId, data.namaKelas, data.tingkat, data.jurusan || '',
      data.idWaliKelas || '', data.namaWaliKelas || '',
      data.tahunAjaran || '2024/2025', data.kapasitas || 30,
      0, data.ruangan || '', data.keterangan || ''
    ]);
    return { success: true, message: 'Kelas berhasil dibuat.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateClass(id, data) {
  try {
    var sheet = getSheet('Classes');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.namaKelas) sheet.getRange(i + 1, 2).setValue(data.namaKelas);
        if (data.tingkat) sheet.getRange(i + 1, 3).setValue(data.tingkat);
        if (data.jurusan !== undefined) sheet.getRange(i + 1, 4).setValue(data.jurusan);
        if (data.idWaliKelas !== undefined) sheet.getRange(i + 1, 5).setValue(data.idWaliKelas);
        if (data.namaWaliKelas !== undefined) sheet.getRange(i + 1, 6).setValue(data.namaWaliKelas);
        if (data.tahunAjaran) sheet.getRange(i + 1, 7).setValue(data.tahunAjaran);
        if (data.kapasitas) sheet.getRange(i + 1, 8).setValue(data.kapasitas);
        if (data.ruangan !== undefined) sheet.getRange(i + 1, 10).setValue(data.ruangan);
        if (data.keterangan !== undefined) sheet.getRange(i + 1, 11).setValue(data.keterangan);
        return { success: true, message: 'Kelas berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Kelas tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteClass(id) {
  try {
    var sheet = getSheet('Classes');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Kelas berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Kelas tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
function getSubjects(classId) {
  try {
    var data = getAllData('Subjects');
    if (classId) data = data.filter(function(r) { return r['ID Kelas'] === classId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getSubjectsByGuru(guruId) {
  try {
    var data = getAllData('Subjects');
    return { success: true, data: data.filter(function(r) { return r['ID Guru'] === guruId; }) };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createSubject(data) {
  try {
    var sheet = getSheet('Subjects');
    var newId = generateIdBackend('SUBJ');
    sheet.appendRow([
      newId, data.namaMapel, data.kodeMapel || '',
      data.idKelas, data.namaKelas, data.idGuru || '',
      data.namaGuru || '', data.sks || 2,
      data.hari || '', data.jamMulai || '', data.jamSelesai || '',
      data.ruangan || '', data.semester || 'Ganjil'
    ]);
    return { success: true, message: 'Mata pelajaran berhasil ditambahkan.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateSubject(id, data) {
  try {
    var sheet = getSheet('Subjects');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.namaMapel) sheet.getRange(i + 1, 2).setValue(data.namaMapel);
        if (data.kodeMapel !== undefined) sheet.getRange(i + 1, 3).setValue(data.kodeMapel);
        if (data.idKelas) sheet.getRange(i + 1, 4).setValue(data.idKelas);
        if (data.namaKelas) sheet.getRange(i + 1, 5).setValue(data.namaKelas);
        if (data.idGuru !== undefined) sheet.getRange(i + 1, 6).setValue(data.idGuru);
        if (data.namaGuru !== undefined) sheet.getRange(i + 1, 7).setValue(data.namaGuru);
        if (data.sks !== undefined) sheet.getRange(i + 1, 8).setValue(data.sks);
        if (data.hari !== undefined) sheet.getRange(i + 1, 9).setValue(data.hari);
        if (data.jamMulai !== undefined) sheet.getRange(i + 1, 10).setValue(data.jamMulai);
        if (data.jamSelesai !== undefined) sheet.getRange(i + 1, 11).setValue(data.jamSelesai);
        if (data.ruangan !== undefined) sheet.getRange(i + 1, 12).setValue(data.ruangan);
        if (data.semester !== undefined) sheet.getRange(i + 1, 13).setValue(data.semester);
        return { success: true, message: 'Mata pelajaran berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Mata pelajaran tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteSubject(id) {
  try {
    var sheet = getSheet('Subjects');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Mata pelajaran berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Mata pelajaran tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
function getAttendance(classId, date) {
  try {
    var data = getAllData('Attendance');
    if (classId) data = data.filter(function(r) { return r['ID Kelas'] === classId; });
    if (date) data = data.filter(function(r) { return r['Tanggal'] === date; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getAttendanceByGuru(guruId) {
  try {
    var data = getAllData('Attendance');
    return { success: true, data: data.filter(function(r) { return r['ID Guru'] === guruId; }) };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getAttendanceHistory(classId, guruId) {
  try {
    var data = getAllData('Attendance');
    if (classId) data = data.filter(function(r) { return r['ID Kelas'] === classId; });
    if (guruId) data = data.filter(function(r) { return r['ID Guru'] === guruId; });
    
    var grouped = {};
    data.forEach(function(r) {
      var key = r['Tanggal'] + '||' + r['ID Guru'] + '||' + r['Nama Guru'] + '||' + r['ID Kelas'] + '||' + r['Nama Kelas'] + '||' + r['Hari'];
      if (!grouped[key]) grouped[key] = { tanggal: r['Tanggal'], hari: r['Hari'], idGuru: r['ID Guru'], namaGuru: r['Nama Guru'], idKelas: r['ID Kelas'], namaKelas: r['Nama Kelas'], namaMapel: r['Nama Mapel'], siswa: [] };
      grouped[key].siswa.push(r);
    });
    return { success: true, data: Object.values(grouped) };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function saveAttendance(attendanceList) {
  try {
    var sheet = getSheet('Attendance');
    var now = new Date();
    var jamAbsen = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    attendanceList.forEach(function(item) {
      var newId = generateIdBackend('ABS');
      var tanggal = item.tanggal;
      var hari = getDayName(tanggal);
      sheet.appendRow([
        newId, tanggal, hari, item.idKelas, item.namaKelas,
        item.idGuru, item.namaGuru, item.idMapel || '', item.namaMapel || '',
        item.nisSiswa, item.namaSiswa, item.status,
        item.keterangan || '', jamAbsen, item.idGuru, now.toISOString()
      ]);
    });
    return { success: true, message: 'Absen berhasil disimpan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateAttendanceRecord(id, updateData) {
  try {
    var sheet = getSheet('Attendance');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (updateData.status) sheet.getRange(i + 1, 12).setValue(updateData.status);
        if (updateData.keterangan !== undefined) sheet.getRange(i + 1, 13).setValue(updateData.keterangan);
        sheet.getRange(i + 1, 15).setValue(updateData.diubahOleh || 'admin');
        sheet.getRange(i + 1, 16).setValue(now);
        return { success: true, message: 'Absen berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Data absen tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteAttendanceRecord(id) {
  try {
    var sheet = getSheet('Attendance');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data absen berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data absen tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getAllAttendanceForPrint(classId, guruId) {
  try {
    var data = getAllData('Attendance');
    if (classId) data = data.filter(function(r) { return r['ID Kelas'] === classId; });
    if (guruId) data = data.filter(function(r) { return r['ID Guru'] === guruId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── EXAMS ─────────────────────────────────────────────────────────────────────
function getExams(guruId) {
  try {
    var data = getAllData('Exams');
    if (guruId) data = data.filter(function(r) { return r['ID Guru'] === guruId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createExam(data) {
  try {
    var sheet = getSheet('Exams');
    var newId = (data.tokenUjian && data.tokenUjian.toString().trim())
      ? data.tokenUjian.toString().trim().toUpperCase()
      : ('EXM-' + Math.floor(1000 + Math.random() * 9000));
    var now = new Date().toISOString();
    var status = data.status || 'active';
    var batasPelanggaran = parseInt(data.batasPelanggaran) || 3;
    sheet.appendRow([
      newId, data.judulUjian, data.idMapel || '', data.namaMapel || '',
      data.idKelas, data.namaKelas, data.idGuru, data.namaGuru,
      data.tanggalMulai || '', data.tanggalSelesai || '', data.durasi || 90,
      status, 0, 100, data.antiCurang || 'true', now, data.keterangan || '',
      batasPelanggaran
    ]);
    // If requested or if autoSeed is true, populate sample questions
    if (data.autoSeed) {
      seedSampleQuestions(newId);
    }
    return { success: true, message: 'Ujian berhasil dibuat dengan Token: ' + newId, id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function seedSampleQuestions(examId) {
  try {
    var sheet = getSheet('Questions');
    var examSheet = getSheet('Exams');
    var samples = [
      { no: 1, q: 'Apa fungsi utama dari klorofil pada tumbuhan hijau?', a: 'Menyerap energi cahaya matahari untuk proses fotosintesis', b: 'Menyerap air dan mineral dari dalam tanah', c: 'Menghasilkan gas karbon dioksida', d: 'Melindungi tumbuhan dari serangan hama', e: 'Mempercepat gugurnya daun tua', ans: 'A', poin: 20 },
      { no: 2, q: 'Ibu kota negara Indonesia yang baru (IKN Nusantara) berlokasi di provinsi...', a: 'Kalimantan Timur', b: 'Kalimantan Barat', c: 'Kalimantan Selatan', d: 'Sulawesi Selatan', e: 'Sumatera Utara', ans: 'A', poin: 20 },
      { no: 3, q: 'Berapakah hasil perhitungan dari: 15 × 8 + 40 ÷ 5?', a: '128', b: '124', c: '130', d: '120', e: '118', ans: 'A', poin: 20 },
      { no: 4, q: 'Sila ketiga dalam Pancasila yang menjadi dasar persatuan bangsa Indonesia adalah...', a: 'Kemanusiaan yang adil dan beradab', b: 'Persatuan Indonesia', c: 'Ketuhanan Yang Maha Esa', d: 'Keadilan sosial bagi seluruh rakyat Indonesia', e: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan', ans: 'B', poin: 20 },
      { no: 5, q: 'Planet yang mendapat julukan sebagai Planet Merah dalam tata surya kita adalah...', a: 'Mars', b: 'Venus', c: 'Jupiter', d: 'Merkurius', e: 'Saturnus', ans: 'A', poin: 20 }
    ];
    samples.forEach(function(s) {
      sheet.appendRow([
        generateIdBackend('QST'), examId, s.no, 'pilihan_ganda',
        s.q, s.a, s.b, s.c, s.d, s.e, s.ans, s.poin, 'Materi kompetensi dasar'
      ]);
    });
    // Update question count in Exams sheet
    var examRows = examSheet.getDataRange().getValues();
    for (var i = 1; i < examRows.length; i++) {
      if (examRows[i][0] === examId) {
        examSheet.getRange(i + 1, 13).setValue(samples.length);
        break;
      }
    }
    return { success: true, message: 'Berhasil membuat ' + samples.length + ' butir soal contoh!', total: samples.length };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateExam(id, data) {
  try {
    var sheet = getSheet('Exams');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.judulUjian) sheet.getRange(i + 1, 2).setValue(data.judulUjian);
        if (data.idMapel !== undefined) sheet.getRange(i + 1, 3).setValue(data.idMapel);
        if (data.namaMapel !== undefined) sheet.getRange(i + 1, 4).setValue(data.namaMapel);
        if (data.idKelas) sheet.getRange(i + 1, 5).setValue(data.idKelas);
        if (data.namaKelas) sheet.getRange(i + 1, 6).setValue(data.namaKelas);
        if (data.tanggalMulai) sheet.getRange(i + 1, 9).setValue(data.tanggalMulai);
        if (data.tanggalSelesai) sheet.getRange(i + 1, 10).setValue(data.tanggalSelesai);
        if (data.durasi) sheet.getRange(i + 1, 11).setValue(data.durasi);
        if (data.status) sheet.getRange(i + 1, 12).setValue(data.status);
        if (data.antiCurang !== undefined) sheet.getRange(i + 1, 15).setValue(data.antiCurang);
        if (data.keterangan !== undefined) sheet.getRange(i + 1, 17).setValue(data.keterangan);
        if (data.batasPelanggaran !== undefined) sheet.getRange(i + 1, 18).setValue(parseInt(data.batasPelanggaran) || 3);
        return { success: true, message: 'Ujian berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Ujian tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteExam(id) {
  try {
    var examSheet = getSheet('Exams');
    var qSheet = getSheet('Questions');
    var rows = examSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        examSheet.deleteRow(i + 1);
        break;
      }
    }
    var qRows = qSheet.getDataRange().getValues();
    for (var j = qRows.length - 1; j >= 1; j--) {
      if (qRows[j][1] === id) qSheet.deleteRow(j + 1);
    }
    return { success: true, message: 'Ujian dan semua soal berhasil dihapus.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────
function getQuestions(examId) {
  try {
    var data = getAllData('Questions');
    return { success: true, data: data.filter(function(r) { return r['ID Ujian'] === examId; }) };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createQuestion(data) {
  try {
    var sheet = getSheet('Questions');
    var examSheet = getSheet('Exams');
    var newId = generateIdBackend('QST');
    sheet.appendRow([
      newId, data.idUjian, data.nomorSoal, data.tipeSoal || 'pilihan_ganda',
      data.pertanyaan, data.opsiA || '', data.opsiB || '',
      data.opsiC || '', data.opsiD || '', data.opsiE || '',
      data.jawabanBenar, data.poin || 10, data.pembahasan || ''
    ]);
    var examRows = examSheet.getDataRange().getValues();
    for (var i = 1; i < examRows.length; i++) {
      if (examRows[i][0] === data.idUjian) {
        var currentCount = parseInt(examRows[i][12]) || 0;
        examSheet.getRange(i + 1, 13).setValue(currentCount + 1);
        break;
      }
    }
    return { success: true, message: 'Soal berhasil ditambahkan.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateQuestion(id, data) {
  try {
    var sheet = getSheet('Questions');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.nomorSoal) sheet.getRange(i + 1, 3).setValue(data.nomorSoal);
        if (data.tipeSoal) sheet.getRange(i + 1, 4).setValue(data.tipeSoal);
        if (data.pertanyaan) sheet.getRange(i + 1, 5).setValue(data.pertanyaan);
        if (data.opsiA !== undefined) sheet.getRange(i + 1, 6).setValue(data.opsiA);
        if (data.opsiB !== undefined) sheet.getRange(i + 1, 7).setValue(data.opsiB);
        if (data.opsiC !== undefined) sheet.getRange(i + 1, 8).setValue(data.opsiC);
        if (data.opsiD !== undefined) sheet.getRange(i + 1, 9).setValue(data.opsiD);
        if (data.opsiE !== undefined) sheet.getRange(i + 1, 10).setValue(data.opsiE);
        if (data.jawabanBenar) sheet.getRange(i + 1, 11).setValue(data.jawabanBenar);
        if (data.poin !== undefined) sheet.getRange(i + 1, 12).setValue(data.poin);
        if (data.pembahasan !== undefined) sheet.getRange(i + 1, 13).setValue(data.pembahasan);
        return { success: true, message: 'Soal berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Soal tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteQuestion(id) {
  try {
    var sheet = getSheet('Questions');
    var rows = sheet.getDataRange().getValues();
    var examId = '';
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        examId = rows[i][1];
        sheet.deleteRow(i + 1);
        break;
      }
    }
    if (examId) {
      var examSheet = getSheet('Exams');
      var examRows = examSheet.getDataRange().getValues();
      for (var j = 1; j < examRows.length; j++) {
        if (examRows[j][0] === examId) {
          var currentCount = parseInt(examRows[j][12]) || 0;
          examSheet.getRange(j + 1, 13).setValue(Math.max(0, currentCount - 1));
          break;
        }
      }
    }
    return { success: true, message: 'Soal berhasil dihapus.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── GRADES ────────────────────────────────────────────────────────────────────
function getGrades(examId, classId, guruId) {
  try {
    var data = getAllData('Grades');
    if (examId) data = data.filter(function(r) { return r['ID Ujian'] === examId; });
    if (classId) data = data.filter(function(r) { return r['ID Kelas'] === classId; });
    if (guruId) data = data.filter(function(r) { return r['ID Guru'] === guruId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function saveGrade(data) {
  try {
    var sheet = getSheet('Grades');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.idUjian && rows[i][7] === data.nisSiswa) {
        sheet.getRange(i + 1, 10).setValue(data.nilai || rows[i][9]);
        sheet.getRange(i + 1, 19).setValue(data.catatanGuru || rows[i][18]);
        sheet.getRange(i + 1, 20).setValue(data.nilaiAkhir || data.nilai || rows[i][9]);
        sheet.getRange(i + 1, 21).setValue(now);
        sheet.getRange(i + 1, 22).setValue(data.status || 'final');
        return { success: true, message: 'Nilai berhasil diperbarui.' };
      }
    }
    
    var newId = generateIdBackend('GRD');
    sheet.appendRow([
      newId, data.idUjian, data.judulUjian || '', data.idMapel || '', data.namaMapel || '',
      data.idKelas, data.namaKelas, data.nisSiswa, data.namaSiswa,
      data.nilai, data.jumlahBenar || 0, data.jumlahSalah || 0, data.totalSoal || 0,
      data.waktuMulai || '', data.waktuSelesai || '', data.durasiMengerjakan || '',
      data.idGuru, data.namaGuru, data.catatanGuru || '',
      data.nilaiAkhir || data.nilai, now, data.status || 'draft'
    ]);
    return { success: true, message: 'Nilai berhasil disimpan.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateGrade(id, data) {
  try {
    var sheet = getSheet('Grades');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (data.nilai !== undefined) sheet.getRange(i + 1, 10).setValue(data.nilai);
        if (data.catatanGuru !== undefined) sheet.getRange(i + 1, 19).setValue(data.catatanGuru);
        if (data.nilaiAkhir !== undefined) sheet.getRange(i + 1, 20).setValue(data.nilaiAkhir);
        if (data.status !== undefined) sheet.getRange(i + 1, 22).setValue(data.status);
        sheet.getRange(i + 1, 21).setValue(now);
        return { success: true, message: 'Nilai berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Data nilai tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteGrade(id) {
  try {
    var sheet = getSheet('Grades');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data nilai berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data nilai tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── VIOLATIONS ────────────────────────────────────────────────────────────────
function getViolations(examId) {
  try {
    var data = getAllData('Violations');
    if (examId) data = data.filter(function(r) { return r['ID Ujian'] === examId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function logViolation(data) {
  try {
    var sheet = getSheet('Violations');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.idUjian && rows[i][5] === data.nisSiswa) {
        var currentCount = parseInt(rows[i][10]) || 0;
        var newCount = currentCount + 1;
        sheet.getRange(i + 1, 8).setValue(data.jenisViolation);
        sheet.getRange(i + 1, 9).setValue(now);
        sheet.getRange(i + 1, 10).setValue(data.detail || '');
        sheet.getRange(i + 1, 11).setValue(newCount);
        return { success: true, count: newCount, message: 'Pelanggaran dicatat.' };
      }
    }
    
    var newId = generateIdBackend('VIO');
    sheet.appendRow([
      newId, data.idUjian, data.judulUjian || '', data.idKelas || '', data.namaKelas || '',
      data.nisSiswa, data.namaSiswa, data.jenisViolation,
      now, data.detail || '', 1
    ]);
    return { success: true, count: 1, message: 'Pelanggaran berhasil dicatat.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteViolation(id) {
  try {
    var sheet = getSheet('Violations');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data pelanggaran berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── EXAM SESSIONS ─────────────────────────────────────────────────────────────
function getExamSessions(examId) {
  try {
    var data = getAllData('ExamSessions');
    if (examId) data = data.filter(function(r) { return r['ID Ujian'] === examId; });
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function startExamSession(data) {
  try {
    var sheet = getSheet('ExamSessions');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.idUjian && (rows[i][5] === data.nisSiswa || (data.namaSiswa && String(rows[i][6]).toLowerCase() === String(data.namaSiswa).toLowerCase()))) {
        if (rows[i][7] === 'finished' || rows[i][7] === 'disqualified') {
          return { success: false, message: 'Siswa sudah menyelesaikan sesi ujian ini dan tidak dapat mengerjakan ulang.' };
        }
        sheet.getRange(i + 1, 8).setValue('active');
        return { success: true, message: 'Sesi dilanjutkan.', id: rows[i][0] };
      }
    }
    
    var newId = generateIdBackend('SES');
    sheet.appendRow([
      newId, data.idUjian, data.judulUjian || '', data.idKelas || '', data.namaKelas || '',
      data.nisSiswa, data.namaSiswa, 'active',
      now, '', '', 0, '', ''
    ]);
    return { success: true, message: 'Sesi ujian dimulai.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getOrCreateExamAnswerPhotosSheet() {
  var sheet = getSheet('ExamAnswerPhotos');
  if (!sheet) {
    var ss = getActiveSs();
    sheet = ss.insertSheet('ExamAnswerPhotos');
    var headers = ['ID Foto', 'ID Sesi', 'ID Ujian', 'NIS Siswa', 'Nomor Soal', 'Foto Base64', 'Waktu Simpan', 'Nama Siswa'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#7c4dff').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveExamAnswerPhoto(examId, nisSiswa, qIdx, photoBase64, namaSiswa, idSesi) {
  try {
    if (!photoBase64) return null;
    var sheet = getOrCreateExamAnswerPhotosSheet();
    var photoId = generateIdBackend('PHT');
    var now = new Date().toISOString();
    var strPhoto = String(photoBase64);
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var normQ = String(qIdx);

    // Hapus data lama untuk soal ini agar tidak terjadi duplikasi atau bentrok
    var rows = sheet.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      var rExam = String(rows[i][2] || '').trim().toLowerCase();
      var rNis = String(rows[i][3] || '').trim().toLowerCase();
      var rNama = String(rows[i][7] || '').trim().toLowerCase();
      var rQ = String(rows[i][4]);
      var matchExam = (rExam === normExam);
      var matchStudent = (normNis && rNis === normNis) || (normNama && rNama === normNama);
      var matchQ = (rQ === normQ || rQ.indexOf(normQ + '_chunk_') === 0);
      if (matchExam && matchStudent && matchQ) {
        sheet.deleteRow(i + 1);
      }
    }

    // Google Sheets limit per cell is 50,000 characters.
    // If the base64 photo is longer than 45,000 chars, chunk it into parts so it NEVER throws.
    if (strPhoto.length > 45000) {
      var chunks = [];
      for (var c = 0; c < strPhoto.length; c += 40000) {
        chunks.push(strPhoto.substring(c, c + 40000));
      }
      for (var chIdx = 0; chIdx < chunks.length; chIdx++) {
        var chunkQ = normQ + '_chunk_' + chIdx;
        sheet.appendRow([
          photoId + '_' + chIdx,
          idSesi || '',
          examId,
          nisSiswa || '',
          chunkQ,
          chunks[chIdx],
          now,
          namaSiswa || ''
        ]);
      }
      return photoId;
    }
    
    sheet.appendRow([
      photoId,
      idSesi || '',
      examId,
      nisSiswa || '',
      normQ,
      strPhoto,
      now,
      namaSiswa || ''
    ]);
    return photoId;
  } catch(e) {
    return null;
  }
}

function getExamAnswerPhotos(examId, nisSiswa, namaSiswa, idSesi) {
  try {
    var sheet = getSheet('ExamAnswerPhotos');
    if (!sheet) return {};
    var rows = sheet.getDataRange().getValues();
    var result = {};
    var chunkMap = {};
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var normSesi = String(idSesi || '').trim().toLowerCase();
    
    for (var i = 1; i < rows.length; i++) {
      var rSesi = String(rows[i][1] || '').trim().toLowerCase();
      var rExam = String(rows[i][2] || '').trim().toLowerCase();
      var rNis = String(rows[i][3] || '').trim().toLowerCase();
      var rNama = String(rows[i][7] || '').trim().toLowerCase();
      var rQ = String(rows[i][4]);
      
      var matchExam = (rExam === normExam);
      var matchSesi = (normSesi && rSesi === normSesi);
      var matchStudent = matchSesi || ((normNis && rNis === normNis) || (normNama && rNama === normNama) || (normNama && rNama && (normNama.indexOf(rNama) !== -1 || rNama.indexOf(normNama) !== -1)));
      
      if (matchExam && matchStudent) {
        if (rQ.indexOf('_chunk_') !== -1) {
          var parts = rQ.split('_chunk_');
          var baseQ = parts[0];
          var chunkIdx = parseInt(parts[1], 10) || 0;
          if (!chunkMap[baseQ]) chunkMap[baseQ] = [];
          chunkMap[baseQ][chunkIdx] = rows[i][5];
        } else {
          result[rQ] = rows[i][5];
        }
      }
    }
    
    for (var bKey in chunkMap) {
      if (chunkMap.hasOwnProperty(bKey)) {
        result[bKey] = chunkMap[bKey].join('');
      }
    }
    return result;
  } catch(e) {
    return {};
  }
}

function getOrCreateExamAnswerVoicesSheet() {
  var sheet = getSheet('ExamAnswerVoices');
  if (!sheet) {
    var ss = getActiveSs();
    sheet = ss.insertSheet('ExamAnswerVoices');
    var headers = ['ID Voice', 'ID Sesi', 'ID Ujian', 'NIS Siswa', 'Nomor Soal', 'Voice Base64', 'Waktu Simpan', 'Nama Siswa'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#7c4dff').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveExamAnswerVoice(examId, nisSiswa, qIdx, voiceBase64, namaSiswa, idSesi) {
  try {
    if (!voiceBase64) return null;
    var sheet = getOrCreateExamAnswerVoicesSheet();
    var voiceId = generateIdBackend('VOC');
    var now = new Date().toISOString();
    var strVoice = String(voiceBase64);
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var normQ = String(qIdx);

    // Hapus data lama untuk soal ini agar tidak terjadi duplikasi atau bentrok
    var rows = sheet.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      var rExam = String(rows[i][2] || '').trim().toLowerCase();
      var rNis = String(rows[i][3] || '').trim().toLowerCase();
      var rNama = String(rows[i][7] || '').trim().toLowerCase();
      var rQ = String(rows[i][4]);
      var matchExam = (rExam === normExam);
      var matchStudent = (normNis && rNis === normNis) || (normNama && rNama === normNama);
      var matchQ = (rQ === normQ || rQ.indexOf(normQ + '_chunk_') === 0);
      if (matchExam && matchStudent && matchQ) {
        sheet.deleteRow(i + 1);
      }
    }

    // Google Sheets limit per cell is 50,000 characters. Chunk if necessary.
    if (strVoice.length > 45000) {
      var chunks = [];
      for (var c = 0; c < strVoice.length; c += 40000) {
        chunks.push(strVoice.substring(c, c + 40000));
      }
      for (var chIdx = 0; chIdx < chunks.length; chIdx++) {
        var chunkQ = normQ + '_chunk_' + chIdx;
        sheet.appendRow([
          voiceId + '_' + chIdx,
          idSesi || '',
          examId,
          nisSiswa || '',
          chunkQ,
          chunks[chIdx],
          now,
          namaSiswa || ''
        ]);
      }
      return voiceId;
    }
    
    sheet.appendRow([
      voiceId,
      idSesi || '',
      examId,
      nisSiswa || '',
      normQ,
      strVoice,
      now,
      namaSiswa || ''
    ]);
    return voiceId;
  } catch(e) {
    return null;
  }
}

function getExamAnswerVoices(examId, nisSiswa, namaSiswa, idSesi) {
  try {
    var sheet = getSheet('ExamAnswerVoices');
    if (!sheet) return {};
    var rows = sheet.getDataRange().getValues();
    var result = {};
    var chunkMap = {};
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var normSesi = String(idSesi || '').trim().toLowerCase();
    
    for (var i = 1; i < rows.length; i++) {
      var rSesi = String(rows[i][1] || '').trim().toLowerCase();
      var rExam = String(rows[i][2] || '').trim().toLowerCase();
      var rNis = String(rows[i][3] || '').trim().toLowerCase();
      var rNama = String(rows[i][7] || '').trim().toLowerCase();
      var rQ = String(rows[i][4]);
      
      var matchExam = (rExam === normExam);
      var matchSesi = (normSesi && rSesi === normSesi);
      var matchStudent = matchSesi || ((normNis && rNis === normNis) || (normNama && rNama === normNama) || (normNama && rNama && (normNama.indexOf(rNama) !== -1 || rNama.indexOf(normNama) !== -1)));
      
      if (matchExam && matchStudent) {
        if (rQ.indexOf('_chunk_') !== -1) {
          var parts = rQ.split('_chunk_');
          var baseQ = parts[0];
          var chunkIdx = parseInt(parts[1], 10) || 0;
          if (!chunkMap[baseQ]) chunkMap[baseQ] = [];
          chunkMap[baseQ][chunkIdx] = rows[i][5];
        } else {
          result[rQ] = rows[i][5];
        }
      }
    }
    
    for (var bKey in chunkMap) {
      if (chunkMap.hasOwnProperty(bKey)) {
        result[bKey] = chunkMap[bKey].join('');
      }
    }
    return result;
  } catch(e) {
    return {};
  }
}

function safeStringifyExamAnswers(answersObj) {
  try {
    var raw = answersObj || {};
    var str = JSON.stringify(raw);
    if (str.length <= 45000) return str;
    
    var safeObj = {};
    for (var k in raw) {
      if (raw.hasOwnProperty(k)) {
        var item = raw[k];
        if (item && typeof item === 'object') {
          safeObj[k] = {
            text: item.text || '',
            hasPhoto: !!(item.photo && String(item.photo).length > 0),
            photoId: item.photoId || '',
            hasVoice: !!(item.voice && String(item.voice).length > 0),
            voiceId: item.voiceId || ''
          };
        } else {
          safeObj[k] = item;
        }
      }
    }
    return JSON.stringify(safeObj);
  } catch(e) {
    return '{}';
  }
}

function finishExamSession(examId, nisSiswa, jawabanJson, namaSiswa) {
  try {
    var sheet = getSheet('ExamSessions');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    var strJson = safeStringifyExamAnswers(jawabanJson);
    
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    
    for (var i = 1; i < rows.length; i++) {
      var matchId = String(rows[i][1] || '').trim().toLowerCase() === normExam;
      var matchNis = normNis && String(rows[i][5] || '').trim().toLowerCase() === normNis;
      var matchNama = normNama && String(rows[i][6] || '').trim().toLowerCase() === normNama;
      if (matchId && (matchNis || matchNama)) {
        sheet.getRange(i + 1, 8).setValue('finished');
        sheet.getRange(i + 1, 10).setValue(now);
        sheet.getRange(i + 1, 11).setValue(strJson);
        return { success: true, message: 'Ujian selesai.' };
      }
    }
    
    // Fallback: jika baris sesi belum ada di ExamSessions, buat otomatis agar jawaban tidak pernah hilang
    var examData = getAllData('Exams');
    var exam = examData.find(function(e) { return String(e['ID Ujian'] || '').trim().toLowerCase() === normExam; }) || {};
    var newId = generateIdBackend('SES');
    sheet.appendRow([
      newId, examId, exam['Judul Ujian'] || '', exam['ID Kelas'] || '', exam['Nama Kelas'] || '',
      nisSiswa || '', namaSiswa || 'Siswa', 'finished',
      now, now, strJson, 0, '', ''
    ]);
    return { success: true, message: 'Ujian selesai & sesi tercatat.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getExamSubmissionsForTeacher(examId) {
  try {
    var normExam = String(examId || '').trim().toLowerCase();
    var sessions = getAllData('ExamSessions').filter(function(s) { 
      return String(s['ID Ujian'] || '').trim().toLowerCase() === normExam; 
    });
    var grades = getAllData('Grades').filter(function(g) { 
      return String(g['ID Ujian'] || '').trim().toLowerCase() === normExam; 
    });
    
    var result = sessions.map(function(s) {
      var sNis = String(s['NIS Siswa'] || '').trim().toLowerCase();
      var sNama = String(s['Nama Siswa'] || '').trim().toLowerCase();
      
      var g = grades.find(function(item) { 
        var gNis = String(item['NIS Siswa'] || '').trim().toLowerCase();
        var gNama = String(item['Nama Siswa'] || '').trim().toLowerCase();
        return (sNis && gNis === sNis) || (sNama && gNama === sNama);
      }) || {};
      
      return {
        idSesi: s['ID Sesi'],
        idUjian: s['ID Ujian'],
        nisSiswa: s['NIS Siswa'],
        namaSiswa: s['Nama Siswa'],
        statusSesi: s['Status Sesi'],
        waktuMasuk: s['Waktu Masuk'],
        waktuSelesai: s['Waktu Selesai'],
        pelanggaran: s['Pelanggaran'] || 0,
        nilai: g['Nilai'] !== undefined ? g['Nilai'] : '-',
        nilaiAkhir: g['Nilai Akhir'] !== undefined ? g['Nilai Akhir'] : (g['Nilai'] || '-'),
        jumlahBenar: g['Jumlah Benar'] || 0,
        totalSoal: g['Total Soal'] || 0,
        statusNilai: g['Status'] || (s['Status Sesi'] === 'finished' ? 'menunggu_koreksi' : 'belum_selesai'),
        catatanGuru: g['Catatan Guru'] || ''
      };
    });
    
    grades.forEach(function(g) {
      var gNis = String(g['NIS Siswa'] || '').trim().toLowerCase();
      var gNama = String(g['Nama Siswa'] || '').trim().toLowerCase();
      var exists = result.some(function(r) { 
        var rNis = String(r.nisSiswa || '').trim().toLowerCase();
        var rNama = String(r.namaSiswa || '').trim().toLowerCase();
        return (gNis && rNis === gNis) || (gNama && rNama === gNama); 
      });
      if (!exists) {
        result.push({
          idSesi: '',
          idUjian: g['ID Ujian'],
          nisSiswa: g['NIS Siswa'],
          namaSiswa: g['Nama Siswa'],
          statusSesi: 'finished',
          waktuMasuk: g['Waktu Mulai'] || '',
          waktuSelesai: g['Waktu Selesai'] || g['Tanggal Input'] || '',
          pelanggaran: 0,
          nilai: g['Nilai'],
          nilaiAkhir: g['Nilai Akhir'] || g['Nilai'],
          jumlahBenar: g['Jumlah Benar'] || 0,
          totalSoal: g['Total Soal'] || 0,
          statusNilai: g['Status'] || 'final',
          catatanGuru: g['Catatan Guru'] || ''
        });
      }
    });

    return { success: true, data: result };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getStudentAnswerSheet(examId, nisSiswa, namaSiswa, idSesi) {
  try {
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var normSesi = String(idSesi || '').trim().toLowerCase();
    
    var sessions = getAllData('ExamSessions');
    var session = null;
    if (normSesi) {
      session = sessions.find(function(s) {
        return String(s['ID Sesi'] || '').trim().toLowerCase() === normSesi;
      });
    }
    if (!session) {
      session = sessions.find(function(s) {
        var sExam = String(s['ID Ujian'] || '').trim().toLowerCase();
        var sNis = String(s['NIS Siswa'] || '').trim().toLowerCase();
        var sNama = String(s['Nama Siswa'] || '').trim().toLowerCase();
        return sExam === normExam && ((normNis && sNis === normNis) || (normNama && sNama === normNama));
      }) || null;
    }
    
    var questionsRes = getQuestions(examId);
    var questions = questionsRes.data || [];
    
    var answers = {};
    if (session && session['Jawaban JSON']) {
      try {
        answers = JSON.parse(session['Jawaban JSON']);
      } catch(e) {
        answers = {};
      }
    }
    
    // Gabungkan foto dari sheet ExamAnswerPhotos jika ada
    var photoMap = getExamAnswerPhotos(examId, nisSiswa, namaSiswa, idSesi);
    for (var qKey in photoMap) {
      if (photoMap.hasOwnProperty(qKey)) {
        var pData = photoMap[qKey];
        if (!answers[qKey]) {
          answers[qKey] = { text: '', photo: pData, voice: '' };
        } else if (typeof answers[qKey] === 'object' && answers[qKey] !== null) {
          answers[qKey].photo = pData;
        } else if (typeof answers[qKey] === 'string') {
          answers[qKey] = { text: answers[qKey], photo: pData, voice: '' };
        }
      }
    }

    // Gabungkan voicenote dari sheet ExamAnswerVoices jika ada
    var voiceMap = getExamAnswerVoices(examId, nisSiswa, namaSiswa, idSesi);

    // Format dan petakan jawaban, foto, dan voicenote STRICTLY berdasarkan indeks soal (0, 1, 2, ...)
    // submitExamAnswers menyimpan dengan kunci String(idx) saja.
    // JANGAN PERNAH menyilangkan ke idx + 1 atau qId agar nomor 20 tidak masuk ke nomor 19!
    questions.forEach(function(q, idx) {
      var sIdx = String(idx);

      // Cari jawaban: prioritas String(idx) karena itulah kunci yang digunakan submitExamAnswers
      var curAns = answers[sIdx] !== undefined ? answers[sIdx] : (answers[idx] !== undefined ? answers[idx] : '');
      var curText = '';
      var curPhoto = '';
      var curVoice = '';

      if (typeof curAns === 'object' && curAns !== null) {
        curText = curAns.text || '';
        curPhoto = curAns.photo || '';
        curVoice = curAns.voice || '';
      } else if (typeof curAns === 'string' && curAns.startsWith('{')) {
        try {
          var pJson = JSON.parse(curAns);
          curText = pJson.text || '';
          curPhoto = pJson.photo || '';
          curVoice = pJson.voice || '';
        } catch(e) {
          curText = curAns;
        }
      } else {
        curText = String(curAns || '');
      }

      // Cari foto dari ExamAnswerPhotos dengan kunci String(idx) (lihat saveExamAnswerPhoto dipanggil dengan sIdx)
      var p = photoMap[sIdx] || photoMap[idx] || curPhoto;
      // Cari voicenote dari ExamAnswerVoices dengan kunci String(idx) (lihat saveExamAnswerVoice dipanggil dengan sIdx)
      var v = voiceMap[sIdx] || voiceMap[idx] || curVoice;

      var finalAnsObj = {
        text: curText,
        photo: p || '',
        voice: v || ''
      };

      answers[idx] = finalAnsObj;
      answers[sIdx] = finalAnsObj;
    });
    
    return {
      success: true,
      session: session,
      questions: questions,
      answers: answers
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteStudentExamSubmission(examId, nisSiswa, namaSiswa) {
  try {
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    
    var deletedSessions = 0;
    var deletedGrades = 0;
    var deletedViolations = 0;
    var deletedPhotos = 0;
    
    // 1. Delete from ExamSessions
    var sessSheet = getSheet('ExamSessions');
    if (sessSheet) {
      var sRows = sessSheet.getDataRange().getValues();
      for (var i = sRows.length - 1; i >= 1; i--) {
        var rExam = String(sRows[i][1] || '').trim().toLowerCase();
        var rNis = String(sRows[i][5] || '').trim().toLowerCase();
        var rNama = String(sRows[i][6] || '').trim().toLowerCase();
        if (rExam === normExam && ((normNis && rNis === normNis) || (normNama && rNama === normNama))) {
          sessSheet.deleteRow(i + 1);
          deletedSessions++;
        }
      }
    }
    
    // 2. Delete from Grades
    var gradeSheet = getSheet('Grades');
    if (gradeSheet) {
      var gRows = gradeSheet.getDataRange().getValues();
      for (var j = gRows.length - 1; j >= 1; j--) {
        var rgExam = String(gRows[j][1] || '').trim().toLowerCase();
        var rgNis = String(gRows[j][7] || '').trim().toLowerCase();
        var rgNama = String(gRows[j][8] || '').trim().toLowerCase();
        if (rgExam === normExam && ((normNis && rgNis === normNis) || (normNama && rgNama === normNama))) {
          gradeSheet.deleteRow(j + 1);
          deletedGrades++;
        }
      }
    }
    
    // 3. Delete from Violations
    var vioSheet = getSheet('Violations');
    if (vioSheet) {
      var vRows = vioSheet.getDataRange().getValues();
      for (var k = vRows.length - 1; k >= 1; k--) {
        var rvExam = String(vRows[k][1] || '').trim().toLowerCase();
        var rvNis = String(vRows[k][5] || '').trim().toLowerCase();
        var rvNama = String(vRows[k][6] || '').trim().toLowerCase();
        if (rvExam === normExam && ((normNis && rvNis === normNis) || (normNama && rvNama === normNama))) {
          vioSheet.deleteRow(k + 1);
          deletedViolations++;
        }
      }
    }
    
    // 4. Delete from ExamAnswerPhotos
    var photoSheet = getSheet('ExamAnswerPhotos');
    if (photoSheet) {
      var pRows = photoSheet.getDataRange().getValues();
      for (var p = pRows.length - 1; p >= 1; p--) {
        var rpExam = String(pRows[p][2] || '').trim().toLowerCase();
        var rpNis = String(pRows[p][3] || '').trim().toLowerCase();
        var rpNama = String(pRows[p][7] || '').trim().toLowerCase();
        if (rpExam === normExam && ((normNis && rpNis === normNis) || (normNama && rpNama === normNama))) {
          photoSheet.deleteRow(p + 1);
          deletedPhotos++;
        }
      }
    }

    // 5. Delete from ExamAnswerVoices
    var deletedVoices = 0;
    var voiceSheet = getSheet('ExamAnswerVoices');
    if (voiceSheet) {
      var vRows = voiceSheet.getDataRange().getValues();
      for (var v = vRows.length - 1; v >= 1; v--) {
        var rvExam = String(vRows[v][2] || '').trim().toLowerCase();
        var rvNis = String(vRows[v][3] || '').trim().toLowerCase();
        var rvNama = String(vRows[v][7] || '').trim().toLowerCase();
        if (rvExam === normExam && ((normNis && rvNis === normNis) || (normNama && rvNama === normNama))) {
          voiceSheet.deleteRow(v + 1);
          deletedVoices++;
        }
      }
    }
    
    return {
      success: true,
      message: 'Riwayat ujian dan pelanggaran siswa berhasil dihapus. Siswa dapat login/memasukkan token untuk mengerjakan ujian kembali.',
      deleted: {
        sessions: deletedSessions,
        grades: deletedGrades,
        violations: deletedViolations,
        photos: deletedPhotos,
        voices: deletedVoices
      }
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function setGradeStatusFinish(examId, nisSiswa, nilaiAkhir, catatanGuru, namaSiswa) {
  try {
    var sheet = getSheet('Grades');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    var found = false;
    
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    
    for (var i = 1; i < rows.length; i++) {
      var rowExam = String(rows[i][1] || '').trim().toLowerCase();
      var rowNis = String(rows[i][7] || '').trim().toLowerCase();
      var rowNama = String(rows[i][8] || '').trim().toLowerCase();
      
      var matchExam = (rowExam === normExam);
      var matchStudent = (normNis && (rowNis === normNis || rowNama === normNis)) ||
                         (normNama && (rowNama === normNama || rowNis === normNama));
                         
      if (matchExam && matchStudent) {
        if (nilaiAkhir !== undefined && nilaiAkhir !== '' && nilaiAkhir !== '-') {
          sheet.getRange(i + 1, 20).setValue(nilaiAkhir);
        }
        if (catatanGuru !== undefined && catatanGuru !== '') {
          sheet.getRange(i + 1, 19).setValue(catatanGuru);
        }
        sheet.getRange(i + 1, 21).setValue(now);
        sheet.getRange(i + 1, 22).setValue('final');
        found = true;
        break;
      }
    }
    
    // Jika baris nilai belum ada di Grades, buat baris baru langsung dengan status final
    if (!found) {
      var sessions = getAllData('ExamSessions');
      var sess = sessions.find(function(s) {
        var sExam = String(s['ID Ujian'] || '').trim().toLowerCase();
        var sNis = String(s['NIS Siswa'] || '').trim().toLowerCase();
        var sNama = String(s['Nama Siswa'] || '').trim().toLowerCase();
        return sExam === normExam && ((normNis && sNis === normNis) || (normNama && sNama === normNama));
      });
      var examData = getAllData('Exams');
      var examObj = examData.find(function(e) {
        return String(e['ID Ujian'] || '').trim().toLowerCase() === normExam;
      }) || {};
      
      var finalScore = (nilaiAkhir !== undefined && nilaiAkhir !== '' && nilaiAkhir !== '-') ? nilaiAkhir : 0;
      var newGradeId = generateIdBackend('GRD');
      sheet.appendRow([
        newGradeId,
        examId,
        (sess ? sess['Judul Ujian'] : examObj['Judul Ujian']) || '',
        examObj['ID Mapel'] || '',
        examObj['Nama Mapel'] || '',
        (sess ? sess['ID Kelas'] : examObj['ID Kelas']) || '',
        (sess ? sess['Nama Kelas'] : examObj['Nama Kelas']) || '',
        nisSiswa || (sess ? sess['NIS Siswa'] : ''),
        namaSiswa || (sess ? sess['Nama Siswa'] : 'Siswa'),
        finalScore,
        0, 0, 0,
        sess ? (sess['Waktu Masuk'] || '') : '',
        sess ? (sess['Waktu Selesai'] || '') : now,
        '',
        examObj['ID Guru'] || '',
        examObj['Nama Guru'] || '',
        catatanGuru || 'Diverifikasi finish oleh dewan guru',
        finalScore,
        now,
        'final'
      ]);
    }
    
    // Tandai status sesi di ExamSessions juga menjadi finished
    try {
      var sessSheet = getSheet('ExamSessions');
      var sessRows = sessSheet.getDataRange().getValues();
      for (var j = 1; j < sessRows.length; j++) {
        var sEx = String(sessRows[j][1] || '').trim().toLowerCase();
        var sN = String(sessRows[j][5] || '').trim().toLowerCase();
        var sNm = String(sessRows[j][6] || '').trim().toLowerCase();
        if (sEx === normExam && ((normNis && sN === normNis) || (normNama && sNm === normNama))) {
          sessSheet.getRange(j + 1, 8).setValue('finished');
        }
      }
    } catch(errSess) {}
    
    return { success: true, message: 'Status berhasil diubah menjadi FINISH! Nilai siswa resmi masuk ke Rekap Nilai.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function disqualifyExamSession(examId, nisSiswa, reason) {
  try {
    var sheet = getSheet('ExamSessions');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === examId && rows[i][5] === nisSiswa) {
        sheet.getRange(i + 1, 8).setValue('disqualified');
        sheet.getRange(i + 1, 10).setValue(now);
        return { success: true, message: 'Siswa berhasil didiskualifikasi dari ujian.' };
      }
    }
    return { success: false, message: 'Sesi siswa tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function checkExamSessionStatus(examId, nisSiswa) {
  try {
    var data = getAllData('ExamSessions');
    var session = data.find(function(s) { return s['ID Ujian'] === examId && s['NIS Siswa'] === nisSiswa; });
    if (!session) return { success: true, status: 'unknown' };
    return { success: true, status: session['Status Sesi'] || 'active' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function getPendingStudents(examId) {
  try {
    var examData = getAllData('Exams');
    var exam = examData.find(function(e) { return e['ID Ujian'] === examId; });
    if (!exam) return { success: false, message: 'Ujian tidak ditemukan.' };
    
    var sessions = getAllData('ExamSessions').filter(function(s) { return s['ID Ujian'] === examId; });
    var activeSisNis = sessions.filter(function(s) { return s['Status Sesi'] === 'active' || s['Status Sesi'] === 'finished'; }).map(function(s) { return s['NIS Siswa']; });
    
    return { 
      success: true, 
      data: {
        sessions: sessions,
        activeSisNis: activeSisNis,
        examInfo: exam
      }
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── STUDENTS MANAGEMENT (Siswa) ───────────────────────────────────────────────
function getStudentsSheetSafe() {
  var sheet = getSheet('Students');
  if (!sheet) {
    var ss = getActiveSs();
    sheet = ss.insertSheet('Students');
    var headers = [
      'ID Siswa', 'NIS', 'NISN', 'Nama Siswa', 'Jenis Kelamin',
      'ID Kelas', 'Nama Kelas', 'Telepon', 'Alamat', 'Status'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#00897b')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Default sample data
    var sampleStudents = [
      ['SIS001', '1001', '0081234501', 'Ahmad Fauzi', 'L', 'KLS001', 'X-A', '08123456001', 'Jl. Merdeka No. 1', 'active'],
      ['SIS002', '1002', '0081234502', 'Budi Santoso', 'L', 'KLS001', 'X-A', '08123456002', 'Jl. Melati No. 2', 'active'],
      ['SIS003', '1003', '0081234503', 'Citra Lestari', 'P', 'KLS001', 'X-A', '08123456003', 'Jl. Mawar No. 3', 'active'],
      ['SIS004', '1004', '0081234504', 'Deni Kurniawan', 'L', 'KLS001', 'X-A', '08123456004', 'Jl. Anggrek No. 4', 'active'],
      ['SIS005', '1005', '0081234505', 'Eka Putri', 'P', 'KLS001', 'X-A', '08123456005', 'Jl. Dahlia No. 5', 'active']
    ];
    sheet.getRange(2, 1, sampleStudents.length, headers.length).setValues(sampleStudents);
  }
  return sheet;
}

function getStudents(classId) {
  try {
    getStudentsSheetSafe();
    var data = getAllData('Students');
    // Pastikan setiap record siswa memiliki ID Siswa yang valid
    data.forEach(function(s, idx) {
      if (!s['ID Siswa']) {
        s['ID Siswa'] = s['NIS'] ? ('SIS-' + s['NIS']) : ('SIS-' + (idx + 1));
      }
    });
    if (classId) {
      var normClass = classId.toString().trim().toLowerCase();
      data = data.filter(function(s) { 
        return (s['ID Kelas'] && s['ID Kelas'].toString().trim().toLowerCase() === normClass) ||
               (s['Nama Kelas'] && s['Nama Kelas'].toString().trim().toLowerCase() === normClass); 
      });
    }
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function createStudent(data) {
  try {
    var sheet = getStudentsSheetSafe();
    var rows = sheet.getDataRange().getValues();
    var cleanNis = (data.nis || '').toString().trim();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] && rows[i][1].toString().trim() === cleanNis) {
        return { success: false, message: 'NIS ' + cleanNis + ' sudah terdaftar.' };
      }
    }
    var newId = generateIdBackend('SIS');
    sheet.appendRow([
      newId, cleanNis, data.nisn || '', data.namaSiswa || '',
      data.jenisKelamin || 'L', data.idKelas || '', data.namaKelas || '',
      data.telepon || '', data.alamat || '', data.status || 'Aktif'
    ]);
    return { success: true, message: 'Data siswa berhasil ditambahkan.', id: newId };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function updateStudent(id, data) {
  try {
    var sheet = getStudentsSheetSafe();
    var rows = sheet.getDataRange().getValues();
    var targetId = (id || '').toString().trim();
    for (var i = 1; i < rows.length; i++) {
      var rowId = (rows[i][0] || '').toString().trim();
      var rowNis = (rows[i][1] || '').toString().trim();
      if ((targetId && rowId === targetId) || (targetId && rowNis === targetId)) {
        if (data.nis) sheet.getRange(i + 1, 2).setValue(data.nis);
        if (data.nisn !== undefined) sheet.getRange(i + 1, 3).setValue(data.nisn);
        if (data.namaSiswa) sheet.getRange(i + 1, 4).setValue(data.namaSiswa);
        if (data.jenisKelamin) sheet.getRange(i + 1, 5).setValue(data.jenisKelamin);
        if (data.idKelas !== undefined) sheet.getRange(i + 1, 6).setValue(data.idKelas);
        if (data.namaKelas !== undefined) sheet.getRange(i + 1, 7).setValue(data.namaKelas);
        if (data.telepon !== undefined) sheet.getRange(i + 1, 8).setValue(data.telepon);
        if (data.alamat !== undefined) sheet.getRange(i + 1, 9).setValue(data.alamat);
        if (data.status) sheet.getRange(i + 1, 10).setValue(data.status);
        return { success: true, message: 'Data siswa berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Siswa tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function deleteStudent(id) {
  try {
    var sheet = getStudentsSheetSafe();
    var rows = sheet.getDataRange().getValues();
    var targetId = (id || '').toString().trim();
    for (var i = 1; i < rows.length; i++) {
      var rowId = (rows[i][0] || '').toString().trim();
      var rowNis = (rows[i][1] || '').toString().trim();
      if ((targetId && rowId === targetId) || (targetId && rowNis === targetId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Siswa tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── STUDENT EXAM TAKING & VERIFICATION ─────────────────────────────────────────
function validateAndStartExam(namaSiswa, token) {
  try {
    var examData = getAllData('Exams');
    var tokenClean = (token || '').toString().trim().toUpperCase();
    var tokenNorm = tokenClean.replace(/[\s\-_]/g, '');
    
    // Find exam by ID, normalized ID, Token column, or Title
    var exam = examData.find(function(e) {
      var id = (e['ID Ujian'] || '').toString().trim().toUpperCase();
      var idNorm = id.replace(/[\s\-_]/g, '');
      var tok = (e['Token'] || '').toString().trim().toUpperCase();
      var tokNorm = tok.replace(/[\s\-_]/g, '');
      var jud = (e['Judul Ujian'] || '').toString().trim().toUpperCase();
      return id === tokenClean || idNorm === tokenNorm || (tok && (tok === tokenClean || tokNorm === tokenNorm)) || (jud && jud === tokenClean);
    });
    
    // If not found and token is demo/standard example like EXM1234 or EXM-1234, or if no exams exist yet
    if (!exam && (tokenNorm === 'EXM1234' || tokenNorm.indexOf('EXM') === 0 || examData.length === 0)) {
      var demoToken = tokenClean || 'EXM1234';
      var demoRes = createExam({
        judulUjian: 'Ujian Penilaian & Evaluasi Pembelajaran (Contoh)',
        idMapel: 'MPL01',
        namaMapel: 'Pengetahuan Umum & Sains',
        idKelas: 'KLS01',
        namaKelas: 'Kelas Semua Jenjang',
        idGuru: 'GRU01',
        namaGuru: 'Guru Pengampu',
        durasi: 60,
        tokenUjian: demoToken,
        status: 'active',
        autoSeed: true,
        keterangan: 'Simulasi ujian online portal sekolah'
      });
      if (demoRes.success) {
        examData = getAllData('Exams');
        exam = examData.find(function(e) {
          return (e['ID Ujian'] || '').toString().trim().toUpperCase() === demoRes.id.toUpperCase();
        });
      }
    }
    
    if (!exam) {
      return { success: false, message: 'Token ujian tidak valid atau ujian tidak ditemukan. Pastikan token yang Anda masukkan sesuai dengan yang diberikan oleh guru.' };
    }
    if (exam['Status'] === 'closed') {
      return { success: false, message: 'Ujian ini telah DITUTUP dan tidak dapat dikerjakan lagi.' };
    }
    
    // Check questions
    var questionsRes = getQuestions(exam['ID Ujian']);
    if (!questionsRes.success || !questionsRes.data || questionsRes.data.length === 0) {
      // Auto-seed sample questions if questions are missing so student/teacher can take the exam immediately
      seedSampleQuestions(exam['ID Ujian']);
      questionsRes = getQuestions(exam['ID Ujian']);
    }
    
    if (!questionsRes.success || !questionsRes.data || questionsRes.data.length === 0) {
      return { success: false, message: 'Soal ujian belum diunggah oleh guru untuk ujian ini. Silakan hubungi guru yang bersangkutan.' };
    }
    
    var safeQuestions = questionsRes.data.map(function(q) {
      var copy = Object.assign({}, q);
      delete copy['Jawaban Benar'];
      delete copy['Pembahasan'];
      return copy;
    });
    
    var cleanNama = (namaSiswa || '').toString().trim();
    if (!cleanNama) {
      return { success: false, message: 'Nama lengkap siswa wajib diisi untuk memulai ujian.' };
    }
    
    // ── VALIDASI: Siswa HARUS terdaftar di kelas ujian ──────────────────────────
    var allStudents = getAllData('Students');
    var examClassId = exam['ID Kelas'] || '';
    
    // Cari siswa berdasarkan nama (case-insensitive)
    var existingStudent = allStudents.find(function(s) {
      return (s['Nama Siswa'] || '').toString().trim().toLowerCase() === cleanNama.toLowerCase();
    });
    
    if (!existingStudent) {
      // Siswa tidak ditemukan sama sekali di database Students
      return {
        success: false,
        message: 'Nama "' + cleanNama + '" tidak terdaftar di sistem. Pastikan Anda mengetik nama lengkap sesuai yang terdaftar, atau hubungi guru/admin.'
      };
    }
    
    // Pastikan siswa terdaftar di kelas yang sama dengan ujian
    if (examClassId && existingStudent['ID Kelas'] && existingStudent['ID Kelas'] !== examClassId) {
      return {
        success: false,
        message: 'Nama "' + cleanNama + '" tidak terdaftar di kelas untuk ujian ini (' + (exam['Nama Kelas'] || examClassId) + '). Pastikan token ujian yang Anda gunakan sesuai dengan kelas Anda.'
      };
    }
    
    // Pastikan status siswa tidak diblokir/nonaktif secara eksplisit
    // (kolom kosong atau nilai selain kata "non/inactive/blokir" dianggap AKTIF)
    var statusVal = (existingStudent['Status'] || '').toString().trim().toLowerCase();
    var statusBlocked = statusVal && (
      statusVal === 'inactive'      ||
      statusVal === 'nonaktif'      ||
      statusVal === 'non aktif'     ||
      statusVal === 'tidak aktif'   ||
      statusVal === 'blokir'        ||
      statusVal === 'blocked'       ||
      statusVal === 'suspended'     ||
      statusVal === 'disable'       ||
      statusVal === 'disabled'
    );
    if (statusBlocked) {
      return {
        success: false,
        message: 'Akun siswa "' + cleanNama + '" dinonaktifkan. Hubungi guru atau admin untuk mengaktifkan akun Anda.'
      };
    }
    
    var studentNis = existingStudent['NIS'] || '';
    // ── AKHIR VALIDASI SISWA ─────────────────────────────────────────────────────

    // CEK SESI UJIAN: Siswa hanya boleh mengerjakan 1 sesi saja
    var allSessions = getAllData('ExamSessions');
    var prevSession = allSessions.find(function(s) {
      if (s['ID Ujian'] !== exam['ID Ujian']) return false;
      var matchNama = (s['Nama Siswa'] || '').toString().trim().toLowerCase() === cleanNama.toLowerCase();
      var matchNis = studentNis && s['NIS Siswa'] === studentNis;
      return matchNama || matchNis;
    });

    if (prevSession) {
      if (prevSession['Status Sesi'] === 'finished') {
        return { 
          success: false, 
          message: 'Siswa atas nama "' + cleanNama + '" sudah menyelesaikan ujian ini sebelumnya. Setiap siswa hanya dapat mengerjakan satu (1) sesi ujian saja.' 
        };
      } else if (prevSession['Status Sesi'] === 'disqualified') {
        return { 
          success: false, 
          message: 'Ujian Anda telah dihentikan oleh sistem/guru karena pelanggaran. Anda tidak dapat mengulang ujian ini.' 
        };
      }
      studentNis = prevSession['NIS Siswa'];
    }

    // CEK REKAP NILAI: Jika sudah ada nilai sebelumnya, tolak pengerjaan ulang
    var allGrades = getAllData('Grades');
    var prevGrade = allGrades.find(function(g) {
      if (g['ID Ujian'] !== exam['ID Ujian']) return false;
      var matchNama = (g['Nama Siswa'] || '').toString().trim().toLowerCase() === cleanNama.toLowerCase();
      var matchNis = studentNis && g['NIS Siswa'] === studentNis;
      return matchNama || matchNis;
    });

    if (prevGrade) {
      return { 
        success: false, 
        message: 'Hasil pengerjaan ujian atas nama "' + cleanNama + '" sudah tercatat di sistem. Anda hanya diperbolehkan mengerjakan satu (1) sesi ujian saja.' 
      };
    }

    if (!studentNis) {
      studentNis = 'SIS-' + Math.floor(1000 + Math.random() * 9000);
    }
    
    var sessionRes = startExamSession({
      idUjian: exam['ID Ujian'],
      judulUjian: exam['Judul Ujian'],
      idKelas: exam['ID Kelas'],
      namaKelas: exam['Nama Kelas'],
      nisSiswa: studentNis,
      namaSiswa: cleanNama
    });

    if (!sessionRes.success) {
      return { success: false, message: sessionRes.message };
    }
    
    return {
      success: true,
      exam: exam,
      questions: safeQuestions,
      totalQuestions: safeQuestions.length,
      sessionId: sessionRes.id,
      nisSiswa: studentNis,
      namaSiswa: cleanNama
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function submitExamAnswers(examId, namaSiswa, nisSiswa, answersMap, statusOverride) {
  try {
    var questionsRes = getQuestions(examId);
    if (!questionsRes.success) return { success: false, message: 'Gagal memvalidasi ujian.' };
    var questions = questionsRes.data || [];
    var examData = getAllData('Exams');
    var exam = examData.find(function(e) { return e['ID Ujian'] === examId; }) || {};
    
    var totalSoal = questions.length;
    var totalPG = 0;
    var benarPG = 0;
    var totalEssay = 0;
    var essayTerkirim = 0;
    
    // Temukan ID Sesi siswa jika sudah ada di ExamSessions agar foto terhubung langsung ke sesi
    var normExam = String(examId || '').trim().toLowerCase();
    var normNis = String(nisSiswa || '').trim().toLowerCase();
    var normNama = String(namaSiswa || '').trim().toLowerCase();
    var sessSheet = getSheet('ExamSessions');
    var targetSessId = '';
    if (sessSheet) {
      var sessRows = sessSheet.getDataRange().getValues();
      for (var sIdx = 1; sIdx < sessRows.length; sIdx++) {
        var sExam = String(sessRows[sIdx][1] || '').trim().toLowerCase();
        var sN = String(sessRows[sIdx][5] || '').trim().toLowerCase();
        var sNm = String(sessRows[sIdx][6] || '').trim().toLowerCase();
        if (sExam === normExam && ((normNis && sN === normNis) || (normNama && sNm === normNama))) {
          targetSessId = sessRows[sIdx][0];
          break;
        }
      }
    }

    var cleanAnswersMap = {};

    questions.forEach(function(q, idx) {
      var sIdx = String(idx);
      var studentAns = (answersMap && (answersMap[idx] !== undefined ? answersMap[idx] : (answersMap[sIdx] !== undefined ? answersMap[sIdx] : ''))) || '';
      var textAns = '';
      var photoAns = '';
      var voiceAns = '';

      if (typeof studentAns === 'object' && studentAns !== null) {
        textAns = studentAns.text || '';
        photoAns = studentAns.photo || '';
        voiceAns = studentAns.voice || '';
      } else if (typeof studentAns === 'string' && studentAns.startsWith('{') && (studentAns.indexOf('"text"') !== -1 || studentAns.indexOf('"photo"') !== -1 || studentAns.indexOf('"voice"') !== -1)) {
        try {
          var parsed = JSON.parse(studentAns);
          textAns = parsed.text || '';
          photoAns = parsed.photo || '';
          voiceAns = parsed.voice || '';
        } catch(e) {
          textAns = studentAns;
        }
      } else {
        textAns = String(studentAns || '');
      }

      var photoId = '';
      var voiceId = '';

      // Simpan foto khusus soal nomor urut index ini saja (tanpa menyilangkan ke soal lain)
      if (photoAns && String(photoAns).indexOf('data:image') === 0) {
        photoId = saveExamAnswerPhoto(examId, nisSiswa, sIdx, photoAns, namaSiswa, targetSessId) || '';
      }

      // Simpan voicenote khusus soal nomor urut index ini saja (tanpa menyilangkan ke soal lain)
      if (voiceAns && (String(voiceAns).indexOf('data:audio') === 0 || String(voiceAns).indexOf('data:video') === 0 || String(voiceAns).indexOf('data:application') === 0 || (String(voiceAns).indexOf('data:') === 0 && String(voiceAns).indexOf('base64,') !== -1))) {
        voiceId = saveExamAnswerVoice(examId, nisSiswa, sIdx, voiceAns, namaSiswa, targetSessId) || '';
      }

      cleanAnswersMap[idx] = {
        text: textAns,
        photo: photoAns,
        voice: voiceAns,
        hasPhoto: !!photoAns,
        photoId: photoId,
        hasVoice: !!voiceAns,
        voiceId: voiceId
      };
      cleanAnswersMap[sIdx] = cleanAnswersMap[idx];

      if (q['Tipe Soal'] === 'essay') {
        totalEssay++;
        if ((textAns && textAns.trim().length > 0) || (photoAns && photoAns.length > 0) || (voiceAns && voiceAns.length > 0)) {
          essayTerkirim++;
        }
      } else {
        totalPG++;
        var correctAns = (q['Jawaban Benar'] || '').toString().trim().toUpperCase();
        if (textAns && textAns.trim().toUpperCase() === correctAns) {
          benarPG++;
        }
      }
    });
    
    var nilaiPG = totalPG > 0 ? Math.round((benarPG / totalPG) * 100) : 0;
    
    // Finish session dengan jawaban yang bersih terindeks
    finishExamSession(examId, nisSiswa, cleanAnswersMap, namaSiswa);
    
    // Status awal adalah menunggu_koreksi agar masuk ke menu ujian guru untuk ditinjau,
    // BUKAN langsung masuk ke menu rekap nilai kecuali sudah status FINISH oleh guru
    var finalStatus = statusOverride || 'menunggu_koreksi';
    var catatan = (statusOverride === 'disqualified')
      ? 'Ujian dihentikan otomatis karena melampaui batas pelanggaran'
      : (totalEssay > 0
          ? 'Nilai Pilihan Ganda: ' + nilaiPG + ' (' + benarPG + '/' + totalPG + ' benar). ' + essayTerkirim + '/' + totalEssay + ' soal essay terkirim, menunggu penilaian guru.'
          : 'Dikerjakan online oleh siswa. Seluruh soal pilihan ganda dinilai otomatis (' + nilaiPG + '). Menunggu konfirmasi status finish guru.');

    // Save Grade
    saveGrade({
      idUjian: examId,
      judulUjian: exam['Judul Ujian'] || '',
      idKelas: exam['ID Kelas'] || '',
      namaKelas: exam['Nama Kelas'] || '',
      nisSiswa: nisSiswa || ('SIS-' + Math.floor(1000 + Math.random() * 9000)),
      namaSiswa: namaSiswa,
      nilai: nilaiPG,
      nilaiAkhir: nilaiPG,
      jumlahBenar: benarPG,
      totalSoal: totalSoal,
      idGuru: exam['ID Guru'] || '',
      namaGuru: exam['Nama Guru'] || '',
      catatanGuru: catatan,
      status: finalStatus
    });
    
    return {
      success: true,
      message: (statusOverride === 'disqualified')
        ? 'Ujian dihentikan otomatis karena melampaui batas pelanggaran. Jawaban telah tersimpan.'
        : 'Ujian berhasil diselesaikan!',
      nilaiPG: nilaiPG,
      benarPG: benarPG,
      totalPG: totalPG,
      totalEssay: totalEssay,
      essayTerkirim: essayTerkirim,
      score: nilaiPG,
      correctCount: benarPG,
      totalSoal: totalSoal,
      isDisqualified: (statusOverride === 'disqualified'),
      hasEssay: totalEssay > 0
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── COPY EXAM TO CLASS (Salin Ujian ke Kelas Lain) ──────────────────────────────
function copyExamToClass(examId, targetClassId, targetClassName, newToken) {
  try {
    // Ambil data ujian asal
    var examData = getAllData('Exams');
    var sourceExam = examData.find(function(e) { return e['ID Ujian'] === examId; });
    if (!sourceExam) return { success: false, message: 'Ujian asal tidak ditemukan.' };

    if (!targetClassId || !targetClassName) {
      return { success: false, message: 'Kelas tujuan wajib dipilih.' };
    }

    // Cek apakah sudah ada ujian yang sama untuk kelas tujuan (berdasarkan guru + nama ujian + kelas)
    var dupCheck = examData.find(function(e) {
      return e['ID Guru'] === sourceExam['ID Guru'] &&
             e['Judul Ujian'] === sourceExam['Judul Ujian'] &&
             e['ID Kelas'] === targetClassId;
    });
    if (dupCheck) {
      return { success: false, message: 'Ujian "' + sourceExam['Judul Ujian'] + '" sudah ada untuk kelas ' + targetClassName + ' (ID: ' + dupCheck['ID Ujian'] + '). Tidak perlu disalin ulang.' };
    }

    // Buat token baru: gunakan yang diberikan, atau buat otomatis
    var tokenBaru = (newToken || '').toString().trim().toUpperCase();
    if (!tokenBaru) {
      tokenBaru = 'EXM-' + Math.floor(1000 + Math.random() * 9000);
    }

    // Cek token tidak bentrok
    var tokenConflict = examData.find(function(e) { return e['ID Ujian'] === tokenBaru; });
    if (tokenConflict) {
      tokenBaru = 'EXM-' + Date.now().toString(36).toUpperCase().substr(-4);
    }

    var now = new Date().toISOString();
    var examSheet = getSheet('Exams');
    var batasPelanggaran = parseInt(sourceExam['Batas Pelanggaran'] || 3);

    // Salin baris ujian ke sheet Exams
    examSheet.appendRow([
      tokenBaru,
      sourceExam['Judul Ujian'],
      sourceExam['ID Mapel'] || '',
      sourceExam['Nama Mapel'] || '',
      targetClassId,
      targetClassName,
      sourceExam['ID Guru'] || '',
      sourceExam['Nama Guru'] || '',
      sourceExam['Tanggal Mulai'] || '',
      sourceExam['Tanggal Selesai'] || '',
      sourceExam['Durasi (menit)'] || 90,
      sourceExam['Status'] || 'active',
      0, // jumlah soal akan diupdate setelah copy soal
      100,
      sourceExam['Anti Curang'] || 'true',
      now,
      '[Disalin dari ' + examId + '] ' + (sourceExam['Keterangan'] || ''),
      batasPelanggaran
    ]);

    // Salin semua soal dari ujian asal
    var questionsRes = getQuestions(examId);
    var sourceQuestions = questionsRes.data || [];
    var qSheet = getSheet('Questions');

    sourceQuestions.forEach(function(q) {
      qSheet.appendRow([
        generateIdBackend('QST'),
        tokenBaru,
        q['Nomor Soal'] || '',
        q['Tipe Soal'] || 'pilihan_ganda',
        q['Pertanyaan'] || '',
        q['Opsi A'] || '',
        q['Opsi B'] || '',
        q['Opsi C'] || '',
        q['Opsi D'] || '',
        q['Opsi E'] || '',
        q['Jawaban Benar'] || '',
        q['Poin'] || 10,
        q['Pembahasan'] || ''
      ]);
    });

    // Update jumlah soal di baris ujian baru
    if (sourceQuestions.length > 0) {
      var allExamRows = examSheet.getDataRange().getValues();
      for (var i = 1; i < allExamRows.length; i++) {
        if (allExamRows[i][0] === tokenBaru) {
          examSheet.getRange(i + 1, 13).setValue(sourceQuestions.length);
          break;
        }
      }
    }

    return {
      success: true,
      message: 'Ujian "' + sourceExam['Judul Ujian'] + '" berhasil disalin ke kelas ' + targetClassName + ' dengan Token baru: ' + tokenBaru + '. Terdapat ' + sourceQuestions.length + ' soal ikut disalin.',
      newExamId: tokenBaru,
      jumlahSoal: sourceQuestions.length
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}
