import { z } from "zod";
import { schoolSettingsSchema, studentSchema, attendanceSchema } from "./validations";

export const BACKUP_FORMAT = "REKAP_SISWA_BACKUP";
export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;
export type RestoreMode = "merge" | "replace";

const backupAttendanceSchema = z.object({
  nis: z.string().min(1, "NIS referensi absensi wajib diisi"),
  nisn: z.string().min(1, "NISN referensi absensi wajib diisi"),
  kelas: attendanceSchema.shape.kelas,
  rombel: attendanceSchema.shape.rombel,
  bulan: attendanceSchema.shape.bulan,
  tahun: attendanceSchema.shape.tahun,
  hadir: attendanceSchema.shape.hadir,
  sakit: attendanceSchema.shape.sakit,
  izin: attendanceSchema.shape.izin,
  alpa: attendanceSchema.shape.alpa,
  catatan: attendanceSchema.shape.catatan,
}).refine((row) => row.hadir + row.sakit + row.izin + row.alpa <= 31, "Jumlah hari absensi tidak boleh melebihi 31");

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT).optional(),
  version: z.union([z.literal(1), z.literal(2)]).optional(),
  exportedAt: z.string().datetime({ offset: true }).optional(),
  students: z.array(studentSchema).max(100_000, "Jumlah siswa dalam backup terlalu besar"),
  settings: schoolSettingsSchema,
  attendance: z.array(backupAttendanceSchema).max(250_000, "Jumlah absensi dalam backup terlalu besar").optional(),
}).superRefine((value, context) => {
  const nisSet = new Set<string>();
  const nisnSet = new Set<string>();
  const studentPairs = new Set<string>();
  value.students.forEach((student, index) => {
    if (nisSet.has(student.nis)) context.addIssue({ code: "custom", path: ["students", index, "nis"], message: "NIS duplikat dalam backup" });
    if (nisnSet.has(student.nisn)) context.addIssue({ code: "custom", path: ["students", index, "nisn"], message: "NISN duplikat dalam backup" });
    nisSet.add(student.nis);
    nisnSet.add(student.nisn);
    studentPairs.add(JSON.stringify([student.nis, student.nisn]));
  });
  const attendanceKeys = new Set<string>();
  value.attendance?.forEach((entry, index) => {
    if (!studentPairs.has(JSON.stringify([entry.nis, entry.nisn]))) context.addIssue({ code: "custom", path: ["attendance", index], message: "Absensi mengacu ke siswa yang tidak ada di backup" });
    const key = JSON.stringify([entry.nisn, entry.bulan, entry.tahun]);
    if (attendanceKeys.has(key)) context.addIssue({ code: "custom", path: ["attendance", index], message: "Absensi siswa dan periode duplikat dalam backup" });
    attendanceKeys.add(key);
  });
});

export type BackupStudent = z.infer<typeof studentSchema>;
export type BackupAttendance = z.infer<typeof backupAttendanceSchema>;
export type BackupSettings = z.infer<typeof schoolSettingsSchema>;
export type SchoolBackup = {
  format: typeof BACKUP_FORMAT;
  version: 2;
  exportedAt: string;
  students: BackupStudent[];
  settings: BackupSettings;
  attendance: BackupAttendance[];
};
export type BackupInspection = {
  backup: SchoolBackup;
  includesAttendance: boolean;
};
export type BackupSummaryRecord = {
  id: number;
  label: string;
  isManual: boolean;
  createdAt: string;
  studentsCount: number;
  attendanceCount: number;
  includesAttendance: boolean;
};

export function inspectBackup(value: unknown): BackupInspection {
  const result = backupSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const location = issue?.path.length ? ` (${issue.path.join(".")})` : "";
    throw new Error(`File backup tidak valid${location}: ${issue?.message || "struktur tidak dikenali"}`);
  }
  return {
    includesAttendance: result.data.attendance !== undefined,
    backup: {
      format: BACKUP_FORMAT,
      version: 2,
      exportedAt: result.data.exportedAt || new Date().toISOString(),
      students: result.data.students,
      settings: result.data.settings,
      attendance: result.data.attendance || [],
    },
  };
}

export function createBackupPayload(students: unknown[], settings: unknown, attendance: unknown[]): SchoolBackup {
  return inspectBackup({ format: BACKUP_FORMAT, version: 2, exportedAt: new Date().toISOString(), students, settings, attendance }).backup;
}

export function getBackupCounts(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  return {
    studentsCount: Array.isArray(data.students) ? data.students.length : 0,
    attendanceCount: Array.isArray(data.attendance) ? data.attendance.length : 0,
    includesAttendance: Array.isArray(data.attendance),
  };
}
