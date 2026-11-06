import { CLASS_OPTIONS, ROMBEL_OPTIONS } from "./constants";
import type { AttendanceRecapRecord, StudentRecord } from "./types";

export type AttendancePeriod = { bulan: number; tahun: number };
export type AttendanceSelection = AttendancePeriod & { kelas: string; rombel: string };
export type AttendanceGrouping = "rombel" | "kelas";

export type SchoolAttendanceStudent = {
  studentId: number;
  nis: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  rombel: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  totalHari: number;
  catatan: string;
  tersimpan: boolean;
};

export type AttendanceGroupSummary = {
  kelas: string;
  rombel: string;
  label: string;
  jumlahSiswa: number;
  sudahDiisi: number;
  belumDiisi: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  totalHari: number;
  persentaseHadir: number | null;
};

export type SchoolAttendanceSummary = AttendancePeriod & {
  perRombel: AttendanceGroupSummary[];
  perKelas: AttendanceGroupSummary[];
  siswa: SchoolAttendanceStudent[];
  totals: Omit<AttendanceGroupSummary, "kelas" | "rombel" | "label">;
  jumlahRombel: number;
  updatedAt: string | null;
};

function emptyGroup(kelas: string, rombel: string): AttendanceGroupSummary {
  return {
    kelas,
    rombel,
    label: `Kelas ${kelas}${rombel}`,
    jumlahSiswa: 0,
    sudahDiisi: 0,
    belumDiisi: 0,
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    totalHari: 0,
    persentaseHadir: null,
  };
}

function attendancePercentage(hadir: number, totalHari: number) {
  return totalHari ? Number(((hadir / totalHari) * 100).toFixed(1)) : null;
}

function normalizeRombel(value: string) {
  return value.trim().toUpperCase();
}

export function isValidAttendancePeriod(bulan: number, tahun: number) {
  return Number.isInteger(bulan) && bulan >= 1 && bulan <= 12 && Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100;
}

/**
 * Reads saved attendance only. Missing entries are explicitly marked as unfilled.
 * A saved class/rombel is the assignment for that reporting period, even if the
 * student's current class changes later. Every student is counted once.
 */
export function buildSchoolAttendanceSummary(
  students: StudentRecord[],
  attendance: AttendanceRecapRecord[],
  bulan: number,
  tahun: number
): SchoolAttendanceSummary {
  if (!isValidAttendancePeriod(bulan, tahun)) throw new Error("Bulan atau tahun rekap absensi tidak valid.");

  const periodRecords = new Map<number, AttendanceRecapRecord>();
  for (const record of attendance) {
    if (record.bulan !== bulan || record.tahun !== tahun) continue;
    const previous = periodRecords.get(record.studentId);
    if (!previous || (record.updatedAt || "") >= (previous.updatedAt || "")) {
      periodRecords.set(record.studentId, record);
    }
  }

  const roster = new Map<number, SchoolAttendanceStudent>();
  for (const student of students) {
    roster.set(student.id, {
      studentId: student.id,
      nis: student.nis,
      nisn: student.nisn,
      namaSiswa: student.namaSiswa,
      kelas: student.kelas.trim(),
      rombel: normalizeRombel(student.rombel),
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      totalHari: 0,
      catatan: "",
      tersimpan: false,
    });
  }
  for (const record of periodRecords.values()) {
    roster.set(record.studentId, {
      studentId: record.studentId,
      nis: record.nis,
      nisn: record.nisn,
      namaSiswa: record.namaSiswa,
      kelas: record.kelas.trim(),
      rombel: normalizeRombel(record.rombel),
      hadir: record.hadir,
      sakit: record.sakit,
      izin: record.izin,
      alpa: record.alpa,
      totalHari: record.hadir + record.sakit + record.izin + record.alpa,
      catatan: record.catatan,
      tersimpan: true,
    });
  }

  const groups = new Map<string, AttendanceGroupSummary>();
  for (const kelas of CLASS_OPTIONS) {
    for (const rombel of ROMBEL_OPTIONS) groups.set(`${kelas}:${rombel}`, emptyGroup(kelas, rombel));
  }
  for (const student of roster.values()) {
    const key = `${student.kelas}:${student.rombel}`;
    const group = groups.get(key) ?? emptyGroup(student.kelas, student.rombel);
    group.jumlahSiswa += 1;
    if (student.tersimpan) group.sudahDiisi += 1;
    else group.belumDiisi += 1;
    group.hadir += student.hadir;
    group.sakit += student.sakit;
    group.izin += student.izin;
    group.alpa += student.alpa;
    group.totalHari += student.totalHari;
    group.persentaseHadir = attendancePercentage(group.hadir, group.totalHari);
    groups.set(key, group);
  }

  const perRombel = Array.from(groups.values()).sort(
    (a, b) => a.kelas.localeCompare(b.kelas, "id", { numeric: true }) || a.rombel.localeCompare(b.rombel, "id")
  );
  const grades = new Map<string, AttendanceGroupSummary>();
  for (const group of perRombel) {
    const grade = grades.get(group.kelas) ?? emptyGroup(group.kelas, "");
    grade.jumlahSiswa += group.jumlahSiswa;
    grade.sudahDiisi += group.sudahDiisi;
    grade.belumDiisi += group.belumDiisi;
    grade.hadir += group.hadir;
    grade.sakit += group.sakit;
    grade.izin += group.izin;
    grade.alpa += group.alpa;
    grade.totalHari += group.totalHari;
    grade.persentaseHadir = attendancePercentage(grade.hadir, grade.totalHari);
    grades.set(group.kelas, grade);
  }

  const totals = perRombel.reduce<SchoolAttendanceSummary["totals"]>(
    (total, group) => ({
      jumlahSiswa: total.jumlahSiswa + group.jumlahSiswa,
      sudahDiisi: total.sudahDiisi + group.sudahDiisi,
      belumDiisi: total.belumDiisi + group.belumDiisi,
      hadir: total.hadir + group.hadir,
      sakit: total.sakit + group.sakit,
      izin: total.izin + group.izin,
      alpa: total.alpa + group.alpa,
      totalHari: total.totalHari + group.totalHari,
      persentaseHadir: null,
    }),
    { jumlahSiswa: 0, sudahDiisi: 0, belumDiisi: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, totalHari: 0, persentaseHadir: null }
  );
  totals.persentaseHadir = attendancePercentage(totals.hadir, totals.totalHari);

  return {
    bulan,
    tahun,
    perRombel,
    perKelas: Array.from(grades.values()),
    siswa: Array.from(roster.values()).sort(
      (a, b) => a.kelas.localeCompare(b.kelas, "id", { numeric: true }) || a.rombel.localeCompare(b.rombel, "id") || a.namaSiswa.localeCompare(b.namaSiswa, "id")
    ),
    totals,
    jumlahRombel: perRombel.filter((group) => group.jumlahSiswa > 0).length,
    updatedAt: Array.from(periodRecords.values()).map((record) => record.updatedAt || "").filter(Boolean).sort().at(-1) || null,
  };
}
