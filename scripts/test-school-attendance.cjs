const assert = require('node:assert/strict');
const { buildSchoolAttendanceSummary, isValidAttendancePeriod } = require(process.env.ATTENDANCE_TEST_MODULE || '/tmp/school-attendance-check/attendance-summary.js');

function student(id, kelas, rombel) {
  return { id, nis: `NIS-${id}`, nisn: `NISN-${id}`, namaSiswa: `Siswa ${id}`, kelas, rombel, jenisKelamin: 'Laki-laki', tanggalLahir: '2015-01-01', usia: 11, tempatLahir: 'Bandung', alamat: '-', namaOrangTua: '-', statusSiswa: 'Aktif' };
}
function attendance(member, values, options = {}) {
  return { id: member.id, studentId: member.id, nis: member.nis, nisn: member.nisn, namaSiswa: member.namaSiswa, kelas: member.kelas, rombel: member.rombel, bulan: 3, tahun: 2026, hadir: values[0], sakit: values[1], izin: values[2], alpa: values[3], catatan: '', updatedAt: '2026-03-31T08:00:00.000Z', ...options };
}

const roster = [student(1, '1', 'A'), student(2, '1', 'B'), student(3, '2', 'A'), student(4, '6', 'B')];
const records = [
  attendance(roster[0], [18, 1, 1, 0]),
  attendance(roster[1], [17, 0, 1, 2]),
  attendance(roster[2], [19, 1, 0, 0], { kelas: '1', rombel: 'B' }),
  attendance(roster[0], [31, 0, 0, 0], { bulan: 4 }),
  attendance(roster[0], [31, 0, 0, 0], { tahun: 2025 }),
];
const summary = buildSchoolAttendanceSummary(roster, records, 3, 2026);
assert.deepEqual(summary.totals, { jumlahSiswa: 4, sudahDiisi: 3, belumDiisi: 1, hadir: 54, sakit: 2, izin: 2, alpa: 2, totalHari: 60, persentaseHadir: 90 });
assert.equal(summary.perRombel.length, 12);
assert.equal(summary.perKelas.length, 6);
assert.equal(summary.perRombel.find(row => row.kelas === '1' && row.rombel === 'A').jumlahSiswa, 1);
assert.equal(summary.perRombel.find(row => row.kelas === '1' && row.rombel === 'B').jumlahSiswa, 2);
assert.equal(summary.perRombel.find(row => row.kelas === '2' && row.rombel === 'A').jumlahSiswa, 0);
assert.equal(summary.perKelas.find(row => row.kelas === '1').hadir, 54);
assert.equal(summary.perRombel.reduce((sum, row) => sum + row.jumlahSiswa, 0), summary.totals.jumlahSiswa);
assert.equal(summary.perKelas.reduce((sum, row) => sum + row.totalHari, 0), summary.totals.totalHari);
assert.equal(new Set(summary.siswa.map(row => row.studentId)).size, summary.siswa.length);
assert.equal(summary.siswa.find(row => row.studentId === 4).tersimpan, false);
assert.equal(summary.siswa.find(row => row.studentId === 4).alpa, 0);
console.log('PASS: all-school totals, grouping, period isolation, and transferred student deduplication');

const unfilled = buildSchoolAttendanceSummary(roster, [], 3, 2026);
assert.equal(unfilled.totals.belumDiisi, 4);
assert.equal(unfilled.totals.sudahDiisi, 0);
assert.equal(unfilled.totals.persentaseHadir, null);
assert.equal(unfilled.totals.alpa, 0);
const empty = buildSchoolAttendanceSummary([], [], 3, 2026);
assert.equal(empty.totals.jumlahSiswa, 0);
assert.equal(empty.perRombel.length, 12);
assert.equal(empty.updatedAt, null);
console.log('PASS: unfilled and empty data do not invent absence records');

const duplicated = buildSchoolAttendanceSummary([roster[0]], [attendance(roster[0], [10, 0, 0, 0], { updatedAt: '2026-03-01T00:00:00.000Z' }), attendance(roster[0], [18, 1, 1, 0])], 3, 2026);
assert.equal(duplicated.totals.hadir, 18);
assert.equal(duplicated.totals.sudahDiisi, 1);
const zeros = buildSchoolAttendanceSummary([roster[0]], [attendance(roster[0], [0, 0, 0, 0])], 3, 2026);
assert.equal(zeros.totals.sudahDiisi, 1);
assert.equal(zeros.totals.belumDiisi, 0);
assert.equal(zeros.totals.persentaseHadir, null);
console.log('PASS: latest saved record counted once; saved zeros distinct from unfilled');

assert.equal(isValidAttendancePeriod(3, 2026), true);
assert.equal(isValidAttendancePeriod(13, 2026), false);
assert.equal(isValidAttendancePeriod(0, 2026), false);
assert.equal(isValidAttendancePeriod(3, 1999), false);
assert.equal(isValidAttendancePeriod(3, 2026.5), false);
assert.throws(() => buildSchoolAttendanceSummary([], [], 13, 2026));
console.log('PASS: invalid reporting periods rejected');
