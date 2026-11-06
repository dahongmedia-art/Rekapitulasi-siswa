import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appBackups, attendanceRecaps, schoolSettings, students } from "@/db/schema";
import { DEFAULT_SCHOOL_SETTINGS } from "@/lib/constants";
import { createBackupPayload, getBackupCounts, inspectBackup, type BackupSummaryRecord, type RestoreMode } from "@/lib/backup-format";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ReadClient = Pick<typeof db, "select">;

async function readSnapshot(client: ReadClient) {
  const studentRows = await client.select().from(students);
  const attendanceRows = await client.select().from(attendanceRecaps);
  const settingsRows = await client.select().from(schoolSettings).limit(1);
  const studentMap = new Map(studentRows.map((student) => [student.id, student]));
  const entries = attendanceRows.map((entry) => {
    const student = studentMap.get(entry.studentId);
    if (!student) throw new Error("Absensi memiliki referensi siswa yang tidak ditemukan. Backup dibatalkan.");
    return { ...entry, nis: student.nis, nisn: student.nisn };
  });
  return createBackupPayload(studentRows, settingsRows[0] || DEFAULT_SCHOOL_SETTINGS, entries);
}

export async function saveSnapshotInTransaction(tx: Transaction, label: string, isManual: boolean) {
  const payload = await readSnapshot(tx);
  const inserted = await tx.insert(appBackups).values({ label: label.slice(0, 255), payload, isManual }).returning();
  return inserted[0];
}

export async function getCurrentBackup() {
  return db.transaction((tx) => readSnapshot(tx), { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function createFullBackup(label: string, isManual = true) {
  return db.transaction((tx) => saveSnapshotInTransaction(tx, label, isManual), { isolationLevel: "repeatable read" });
}

export async function listBackupSummaries(): Promise<BackupSummaryRecord[]> {
  const rows = await db.select().from(appBackups).orderBy(desc(appBackups.createdAt));
  return rows.map((row) => ({ id: row.id, label: row.label, isManual: row.isManual, createdAt: row.createdAt.toISOString(), ...getBackupCounts(row.payload) }));
}

export async function getBackupEntry(id: number) {
  const rows = await db.select().from(appBackups).where(eq(appBackups.id, id)).limit(1);
  return rows[0] || null;
}

export async function restoreFullBackup(input: unknown, mode: RestoreMode) {
  const { backup } = inspectBackup(input);
  if (!backup.students.length) throw new Error("Backup kosong tidak dapat dipulihkan. Data saat ini tidak diubah.");
  if (mode !== "merge" && mode !== "replace") throw new Error("Mode pemulihan tidak valid.");

  return db.transaction(async (tx) => {
    const safety = await saveSnapshotInTransaction(tx, "Salinan otomatis sebelum pemulihan data", false);
    const currentSettings = (await tx.select().from(schoolSettings).limit(1))[0];
    let currentStudents = await tx.select().from(students);
    if (mode === "replace") {
      await tx.delete(attendanceRecaps);
      await tx.delete(students);
      currentStudents = [];
    }

    const byNis = new Map(currentStudents.map((student) => [student.nis, student]));
    const byNisn = new Map(currentStudents.map((student) => [student.nisn, student]));
    const restoredIds = new Map<string, number>();
    let addedStudents = 0;
    let keptStudents = 0;
    for (const student of backup.students) {
      const matchNis = byNis.get(student.nis);
      const matchNisn = byNisn.get(student.nisn);
      if (matchNis && matchNisn && matchNis.id !== matchNisn.id) throw new Error("NIS dan NISN backup mengacu ke siswa berbeda. Seluruh pemulihan dibatalkan; data lama tetap utuh.");
      const found = matchNis || matchNisn;
      if (found) {
        if (found.nis !== student.nis || found.nisn !== student.nisn) throw new Error("Ada NIS/NISN yang bertentangan dengan data saat ini. Pemulihan dibatalkan agar data tidak tertukar.");
        restoredIds.set(student.nisn, found.id);
        keptStudents += 1;
      } else {
        const inserted = (await tx.insert(students).values({ ...student, updatedAt: new Date() }).returning())[0];
        byNis.set(inserted.nis, inserted);
        byNisn.set(inserted.nisn, inserted);
        restoredIds.set(student.nisn, inserted.id);
        addedStudents += 1;
      }
    }

    let addedAttendance = 0;
    for (let start = 0; start < backup.attendance.length; start += 250) {
      const values = backup.attendance.slice(start, start + 250).map(({ nis, nisn, ...entry }) => {
        const studentId = restoredIds.get(nisn);
        if (!studentId) throw new Error("Referensi absensi tidak ditemukan. Pemulihan dibatalkan.");
        return { ...entry, studentId, updatedAt: new Date() };
      });
      const inserted = await tx.insert(attendanceRecaps).values(values).onConflictDoNothing({ target: [attendanceRecaps.studentId, attendanceRecaps.bulan, attendanceRecaps.tahun] }).returning({ id: attendanceRecaps.id });
      addedAttendance += inserted.length;
    }

    if (mode === "replace" || !currentSettings) {
      const values = { ...DEFAULT_SCHOOL_SETTINGS, ...backup.settings, updatedAt: new Date() };
      if (currentSettings) await tx.update(schoolSettings).set(values).where(eq(schoolSettings.id, currentSettings.id));
      else await tx.insert(schoolSettings).values(values);
    }
    return { safetyBackupId: safety.id, addedStudents, keptStudents, addedAttendance, keptAttendance: backup.attendance.length - addedAttendance };
  }, { isolationLevel: "serializable" });
}
