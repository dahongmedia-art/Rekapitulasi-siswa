const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
require('dotenv').config({ quiet: true });

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'server-only') return {};
  if (request.startsWith('@/')) {
    const base = path.resolve('src', request.slice(2));
    request = fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts');
  }
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const {inspectBackup, BACKUP_FORMAT} = require(path.resolve('src/lib/backup-format.ts'));
const member = { nis: 'TEST-1', nisn: 'TEST-NISN-1', namaSiswa: 'Siswa Pemeriksaan', jenisKelamin: 'Laki-laki', tempatLahir: 'Bandung', tanggalLahir: '2016-05-10', kelas: '1', rombel: 'A', alamat: 'Alamat pengujian', namaOrangTua: 'Wali Pengujian', statusSiswa: 'Aktif' };
const settings = { namaSekolah: 'Sekolah Pemeriksaan', npsn: '', alamat: '', desaKelurahan: '', kecamatan: '', kabupaten: '', provinsi: '', tahunPelajaran: '', namaKepalaSekolah: '', nipKepalaSekolah: '', namaOperator: '' };
const attendance = { nis: member.nis, nisn: member.nisn, kelas: '1', rombel: 'A', bulan: 3, tahun: 2026, hadir: 18, sakit: 1, izin: 1, alpa: 0, catatan: '' };
const legacy = { students: [member], settings, exportedAt: '2026-03-31T00:00:00.000Z' };
const full = { ...legacy, format: BACKUP_FORMAT, version: 2, attendance: [attendance] };

(async () => {
  assert.equal(inspectBackup(legacy).includesAttendance, false);
  assert.equal(inspectBackup(full).includesAttendance, true);
  assert.equal(inspectBackup(full).backup.attendance.length, 1);
  assert.throws(() => inspectBackup({ ...full, students: 'not an array' }));
  assert.throws(() => inspectBackup({ ...full, students: [member, member] }));
  assert.throws(() => inspectBackup({ ...full, attendance: [{ ...attendance, nisn: 'NOT-IN-BACKUP' }] }));
  assert.throws(() => inspectBackup({ ...full, attendance: [attendance, attendance] }));
  assert.throws(() => inspectBackup({ ...full, attendance: [{ ...attendance, hadir: 31, sakit: 2 }] }));
  assert.throws(() => inspectBackup({ ...full, version: 99 }));
  console.log('PASS: legacy/full backup validation, duplicate detection, and invalid attendance rejection');

  if (!process.argv.includes('--database')) return;
  const {db, pool} = require(path.resolve('src/db/index.ts'));
  const {students, attendanceRecaps, appBackups} = require(path.resolve('src/db/schema.ts'));
  const {getCurrentBackup, listBackupSummaries, restoreFullBackup} = require(path.resolve('src/lib/backup-store.ts'));
  const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const readRows = async table => (await db.select().from(table)).sort((a,b)=>a.id-b.id);
  try {
    const before = await readRows(students);
    const attendanceBefore = await readRows(attendanceRecaps);
    const backupsBefore = await readRows(appBackups);
    const backup = await getCurrentBackup();
    assert.equal(backup.students.length, before.length);
    assert.equal(backup.attendance.length, attendanceBefore.length);
    for (const entry of backupsBefore) inspectBackup(entry.payload);
    const metadata = await listBackupSummaries();
    assert.equal(metadata.length, backupsBefore.length);
    await assert.rejects(() => restoreFullBackup({ malformed: true }, 'replace'));
    await assert.rejects(() => restoreFullBackup({ ...full, students: [], attendance: [] }, 'replace'));
    assert.equal(digest(await readRows(students)), digest(before));
    assert.equal(digest(await readRows(attendanceRecaps)), digest(attendanceBefore));
    assert.equal(digest(await readRows(appBackups)), digest(backupsBefore));
    console.log('PASS: current full backup and history are valid; invalid/empty restore leaves all records unchanged');
    console.log('Verified storage counts:', { students: before.length, attendance: attendanceBefore.length, backups: backupsBefore.length });
  } finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exit(1); });
