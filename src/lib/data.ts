import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecaps, schoolSettings, students } from "@/db/schema";
import { DEFAULT_SCHOOL_SETTINGS } from "@/lib/constants";
import { createFullBackup, listBackupSummaries, restoreFullBackup, saveSnapshotInTransaction } from "@/lib/backup-store";
import type { RestoreMode } from "@/lib/backup-format";
import { calculateAge, calculateAgeAt, getMonthName } from "@/lib/utils";
import type { AgeRecapRow, AttendanceInput, AttendanceRecapRecord, DashboardSummary, MonthlyAgeRecap, SchoolSettingsRecord, SemesterAgeRecap, StudentFilters, StudentRecord, YearlyAgeRecap } from "@/lib/types";

export type StudentInput = {
  nis: string;
  nisn: string;
  namaSiswa: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  kelas: string;
  rombel: string;
  alamat: string;
  namaOrangTua: string;
  statusSiswa: string;
};

function mapStudent(row: typeof students.$inferSelect): StudentRecord {
  return {
    id: row.id,
    nis: row.nis,
    nisn: row.nisn,
    namaSiswa: row.namaSiswa,
    jenisKelamin: row.jenisKelamin,
    tempatLahir: row.tempatLahir,
    tanggalLahir: row.tanggalLahir,
    usia: calculateAge(row.tanggalLahir),
    kelas: row.kelas,
    rombel: row.rombel,
    alamat: row.alamat,
    namaOrangTua: row.namaOrangTua,
    statusSiswa: row.statusSiswa,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  };
}

function toDbStudent(payload: StudentInput) {
  return {
    nis: payload.nis,
    nisn: payload.nisn,
    namaSiswa: payload.namaSiswa,
    jenisKelamin: payload.jenisKelamin,
    tempatLahir: payload.tempatLahir,
    tanggalLahir: payload.tanggalLahir,
    kelas: payload.kelas,
    rombel: payload.rombel,
    alamat: payload.alamat,
    namaOrangTua: payload.namaOrangTua,
    statusSiswa: payload.statusSiswa,
    updatedAt: new Date(),
  };
}

export async function ensureSchoolSettings() {
  const existing = await db.select().from(schoolSettings).limit(1);
  if (existing[0]) {
    const current = existing[0];
    if (current.namaSekolah === "REKAP SISWA" && !current.npsn) {
      const updated = await db.update(schoolSettings).set({
        namaSekolah: DEFAULT_SCHOOL_SETTINGS.namaSekolah,
        npsn: DEFAULT_SCHOOL_SETTINGS.npsn,
        kecamatan: current.kecamatan || DEFAULT_SCHOOL_SETTINGS.kecamatan,
        kabupaten: current.kabupaten || DEFAULT_SCHOOL_SETTINGS.kabupaten,
        provinsi: current.provinsi || DEFAULT_SCHOOL_SETTINGS.provinsi,
        updatedAt: new Date(),
      }).where(eq(schoolSettings.id, current.id)).returning();
      return updated[0];
    }
    return current;
  }

  const inserted = await db.insert(schoolSettings).values(DEFAULT_SCHOOL_SETTINGS).returning();
  return inserted[0];
}

export async function getSchoolSettings(): Promise<SchoolSettingsRecord> {
  const settings = await ensureSchoolSettings();
  return {
    id: settings.id,
    namaSekolah: settings.namaSekolah,
    npsn: settings.npsn,
    alamat: settings.alamat,
    desaKelurahan: settings.desaKelurahan,
    kecamatan: settings.kecamatan,
    kabupaten: settings.kabupaten,
    provinsi: settings.provinsi,
    tahunPelajaran: settings.tahunPelajaran,
    namaKepalaSekolah: settings.namaKepalaSekolah,
    nipKepalaSekolah: settings.nipKepalaSekolah,
    namaOperator: settings.namaOperator,
    logoPemerintah: settings.logoPemerintah,
    logoSekolah: settings.logoSekolah,
    updatedAt: settings.updatedAt?.toISOString(),
  };
}

export async function updateSchoolSettings(payload: SchoolSettingsRecord) {
  const current = await ensureSchoolSettings();
  const updated = await db
    .update(schoolSettings)
    .set({
      namaSekolah: payload.namaSekolah,
      npsn: payload.npsn,
      alamat: payload.alamat,
      desaKelurahan: payload.desaKelurahan,
      kecamatan: payload.kecamatan,
      kabupaten: payload.kabupaten,
      provinsi: payload.provinsi,
      tahunPelajaran: payload.tahunPelajaran,
      namaKepalaSekolah: payload.namaKepalaSekolah,
      nipKepalaSekolah: payload.nipKepalaSekolah,
      namaOperator: payload.namaOperator,
      ...(payload.logoPemerintah !== undefined ? { logoPemerintah: payload.logoPemerintah } : {}),
      ...(payload.logoSekolah !== undefined ? { logoSekolah: payload.logoSekolah } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schoolSettings.id, current.id))
    .returning();
  return updated[0];
}

export async function getStudents(filters: StudentFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const sortBy = filters.sortBy ?? "namaSiswa";
  const sortDir = filters.sortDir ?? "asc";

  const conditions = [];

  if (filters.q) {
    conditions.push(
      sql`(${students.namaSiswa} ILIKE ${`%${filters.q}%`} OR ${students.nisn} ILIKE ${`%${filters.q}%`} OR ${students.nis} ILIKE ${`%${filters.q}%`})`
    );
  }
  if (filters.kelas) conditions.push(eq(students.kelas, filters.kelas));
  if (filters.jenisKelamin) conditions.push(eq(students.jenisKelamin, filters.jenisKelamin));
  if (filters.statusSiswa) conditions.push(eq(students.statusSiswa, filters.statusSiswa));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db.select().from(students).where(whereClause);
  let mapped = rows.map(mapStudent);

  if (filters.usia) {
    mapped = mapped.filter((student) => String(student.usia) === String(filters.usia));
  }

  mapped.sort((a, b) => {
    const direction = sortDir === "asc" ? 1 : -1;
    const aValue = String((a as Record<string, unknown>)[sortBy] ?? "");
    const bValue = String((b as Record<string, unknown>)[sortBy] ?? "");
    return aValue.localeCompare(bValue, "id") * direction;
  });

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  const data = mapped.slice(start, start + pageSize);

  return {
    data,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    pageSize,
  };
}

export async function getAllStudents() {
  const rows = await db.select().from(students).orderBy(asc(students.namaSiswa));
  return rows.map(mapStudent);
}

export async function getStudentById(id: number) {
  const rows = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return rows[0] ? mapStudent(rows[0]) : null;
}

function buildAgeRecapAt(studentsData: StudentRecord[], atDate: Date): AgeRecapRow[] {
  const ageMap = new Map<number, AgeRecapRow>();

  for (const student of studentsData) {
    const usia = calculateAgeAt(student.tanggalLahir, atDate);
    const entry = ageMap.get(usia) ?? { usia, lakiLaki: 0, perempuan: 0, total: 0 };
    if (student.jenisKelamin === "Laki-laki") entry.lakiLaki += 1;
    if (student.jenisKelamin === "Perempuan") entry.perempuan += 1;
    entry.total += 1;
    ageMap.set(usia, entry);
  }

  return Array.from(ageMap.values()).sort((a, b) => a.usia - b.usia);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const all = await getAllStudents();
  const totalSiswa = all.length;
  const totalLakiLaki = all.filter((item) => item.jenisKelamin === "Laki-laki").length;
  const totalPerempuan = all.filter((item) => item.jenisKelamin === "Perempuan").length;

  const perKelasMap = new Map<string, { kelas: string; lakiLaki: number; perempuan: number; total: number }>();

  for (const student of all) {
    const kelasEntry = perKelasMap.get(student.kelas) ?? {
      kelas: student.kelas,
      lakiLaki: 0,
      perempuan: 0,
      total: 0,
    };
    if (student.jenisKelamin === "Laki-laki") kelasEntry.lakiLaki += 1;
    if (student.jenisKelamin === "Perempuan") kelasEntry.perempuan += 1;
    kelasEntry.total += 1;
    perKelasMap.set(student.kelas, kelasEntry);
  }

  const perKelas = Array.from(perKelasMap.values()).sort((a, b) => Number(a.kelas) - Number(b.kelas));
  const perUsia = buildAgeRecapAt(all, new Date());

  return {
    totalSiswa,
    totalLakiLaki,
    totalPerempuan,
    persentaseLakiLaki: totalSiswa ? Number(((totalLakiLaki / totalSiswa) * 100).toFixed(1)) : 0,
    persentasePerempuan: totalSiswa ? Number(((totalPerempuan / totalSiswa) * 100).toFixed(1)) : 0,
    perKelas,
    perUsia,
  };
}

export async function getMonthlyAgeRecap(month: number, year: number): Promise<MonthlyAgeRecap> {
  const all = await getAllStudents();
  const atDate = new Date(year, month, 0);
  const perUsia = buildAgeRecapAt(all, atDate);
  return {
    bulan: month,
    tahun: year,
    label: `${getMonthName(month)} ${year}`,
    perUsia,
    totalSiswa: all.length,
  };
}

export async function getYearlyAgeRecap(year: number): Promise<YearlyAgeRecap> {
  const months = await Promise.all(Array.from({ length: 12 }, (_, index) => getMonthlyAgeRecap(index + 1, year)));
  return { tahun: year, months };
}

export async function getSemesterAgeRecap(year: number, semester: 1 | 2): Promise<SemesterAgeRecap> {
  const startMonth = semester === 1 ? 1 : 7;
  const months = await Promise.all(Array.from({ length: 6 }, (_, index) => getMonthlyAgeRecap(startMonth + index, year)));
  return { tahun: year, semester, months };
}

export async function createStudent(payload: StudentInput) {
  const inserted = await db.insert(students).values(toDbStudent(payload)).returning();
  return mapStudent(inserted[0]);
}

export async function updateStudent(id: number, payload: StudentInput) {
  const updated = await db.update(students).set(toDbStudent(payload)).where(eq(students.id, id)).returning();
  return updated[0] ? mapStudent(updated[0]) : null;
}

export async function deleteStudent(id: number) {
  return db.transaction(async (tx) => {
    await saveSnapshotInTransaction(tx, "Salinan otomatis sebelum menghapus siswa", false);
    const deleted = await tx.delete(students).where(eq(students.id, id)).returning();
    return deleted[0] ? mapStudent(deleted[0]) : null;
  });
}

export async function replaceAllStudents(payload: StudentInput[]) {
  if (!payload.length) throw new Error("Data pengganti kosong. Data saat ini tidak diubah.");
  return db.transaction(async (tx) => {
    await saveSnapshotInTransaction(tx, "Salinan otomatis sebelum mengganti seluruh data siswa", false);
    await tx.delete(students);
    const inserted = await tx.insert(students).values(payload.map(toDbStudent)).returning();
    return inserted.map(mapStudent);
  });
}

export async function upsertManyStudents(payload: StudentInput[]) {
  const existing = await db.select().from(students);
  const existingMap = new Map(existing.flatMap((item) => [[item.nis, item.id], [item.nisn, item.id]]));

  for (const item of payload) {
    const foundId = existingMap.get(item.nis) ?? existingMap.get(item.nisn);
    if (foundId) {
      await db.update(students).set(toDbStudent(item)).where(eq(students.id, foundId));
    } else {
      await db.insert(students).values(toDbStudent(item));
    }
  }
}

export async function addManyStudents(payload: StudentInput[]) {
  if (!payload.length) return;
  await db.insert(students).values(payload.map(toDbStudent));
}

export async function getAllAttendanceRecaps(filters: { bulan?: number; tahun?: number } = {}): Promise<AttendanceRecapRecord[]> {
  const rows = await db
    .select({
      id: attendanceRecaps.id,
      studentId: attendanceRecaps.studentId,
      nis: students.nis,
      nisn: students.nisn,
      namaSiswa: students.namaSiswa,
      kelas: attendanceRecaps.kelas,
      rombel: attendanceRecaps.rombel,
      bulan: attendanceRecaps.bulan,
      tahun: attendanceRecaps.tahun,
      hadir: attendanceRecaps.hadir,
      sakit: attendanceRecaps.sakit,
      izin: attendanceRecaps.izin,
      alpa: attendanceRecaps.alpa,
      catatan: attendanceRecaps.catatan,
      updatedAt: attendanceRecaps.updatedAt,
    })
    .from(attendanceRecaps)
    .innerJoin(students, eq(attendanceRecaps.studentId, students.id))
    .where(and(
      filters.bulan !== undefined ? eq(attendanceRecaps.bulan, filters.bulan) : undefined,
      filters.tahun !== undefined ? eq(attendanceRecaps.tahun, filters.tahun) : undefined
    ))
    .orderBy(asc(attendanceRecaps.tahun), asc(attendanceRecaps.bulan), asc(students.namaSiswa));

  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function saveAttendanceRecaps(payload: AttendanceInput[]) {
  if (!payload.length) return;

  await db
    .insert(attendanceRecaps)
    .values(
      payload.map((item) => ({
        studentId: item.studentId,
        kelas: item.kelas,
        rombel: item.rombel,
        bulan: item.bulan,
        tahun: item.tahun,
        hadir: item.hadir,
        sakit: item.sakit,
        izin: item.izin,
        alpa: item.alpa,
        catatan: item.catatan,
        updatedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: [attendanceRecaps.studentId, attendanceRecaps.bulan, attendanceRecaps.tahun],
      set: {
        kelas: sql`excluded.kelas`,
        rombel: sql`excluded.rombel`,
        hadir: sql`excluded.hadir`,
        sakit: sql`excluded.sakit`,
        izin: sql`excluded.izin`,
        alpa: sql`excluded.alpa`,
        catatan: sql`excluded.catatan`,
        updatedAt: new Date(),
      },
    });
}

export async function createBackup(label: string) {
  return createFullBackup(label);
}

export async function getBackups() {
  return listBackupSummaries();
}

export async function restoreBackup(payload: unknown, mode: RestoreMode = "merge") {
  return restoreFullBackup(payload, mode);
}

export async function findDuplicatesByNisNisn(items: Array<{ nis: string; nisn: string }>) {
  const nisValues = items.map((item) => item.nis).filter(Boolean);
  const nisnValues = items.map((item) => item.nisn).filter(Boolean);
  if (!nisValues.length && !nisnValues.length) return [];

  const foundByNis = nisValues.length ? await db.select().from(students).where(inArray(students.nis, nisValues)) : [];
  const foundByNisn = nisnValues.length ? await db.select().from(students).where(inArray(students.nisn, nisnValues)) : [];
  const unique = new Map<number, StudentRecord>();
  [...foundByNis, ...foundByNisn].map(mapStudent).forEach((item) => unique.set(item.id, item));
  return Array.from(unique.values());
}
