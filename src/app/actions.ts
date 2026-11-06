"use server";

import { revalidatePath } from "next/cache";
import { addManyStudents, createBackup, createStudent, deleteStudent, replaceAllStudents, restoreBackup, saveAttendanceRecaps, updateSchoolSettings, updateStudent, upsertManyStudents, type StudentInput } from "@/lib/data";
import { attendanceSchema, schoolSettingsSchema, studentSchema } from "@/lib/validations";
import type { AttendanceInput, SchoolSettingsRecord } from "@/lib/types";
import type { RestoreMode } from "@/lib/backup-format";

function refreshAll() {
  ["/", "/?tab=students", "/?tab=rekap", "/?tab=usia", "/?tab=attendance", "/?tab=import", "/?tab=export", "/?tab=print", "/?tab=backup", "/?tab=settings"].forEach((path) =>
    revalidatePath(path)
  );
}

export async function saveStudentAction(input: StudentInput, id?: number) {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Data siswa tidak valid" };
  }

  try {
    if (id) {
      await updateStudent(id, parsed.data);
    } else {
      await createStudent(parsed.data);
    }
    refreshAll();
    return { success: true, message: id ? "Data siswa berhasil diperbarui" : "Data siswa berhasil ditambahkan" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal menyimpan data siswa" };
  }
}

export async function deleteStudentAction(id: number) {
  try {
    await deleteStudent(id);
    refreshAll();
    return { success: true, message: "Data siswa berhasil dihapus" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal menghapus data siswa" };
  }
}

export async function saveSettingsAction(input: SchoolSettingsRecord) {
  const parsed = schoolSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Data pengaturan tidak valid" };
  }

  try {
    await updateSchoolSettings(parsed.data);
    refreshAll();
    return { success: true, message: "Pengaturan sekolah berhasil disimpan" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal menyimpan pengaturan" };
  }
}

export async function importStudentsAction(mode: "add" | "update" | "replace", input: StudentInput[]) {
  const invalid = input.find((item) => !studentSchema.safeParse(item).success);
  if (invalid) {
    return { success: false, message: "Terdapat data import yang tidak valid" };
  }

  try {
    if (mode === "replace") {
      await replaceAllStudents(input);
    } else if (mode === "update") {
      await upsertManyStudents(input);
    } else {
      await addManyStudents(input);
    }
    refreshAll();
    return { success: true, message: "Import data siswa berhasil" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal mengimpor data siswa" };
  }
}

export async function saveAttendanceAction(input: AttendanceInput[]) {
  const parsed = input.map((item) => attendanceSchema.safeParse(item));
  const invalid = parsed.find((item) => !item.success);
  if (invalid && !invalid.success) {
    return { success: false, message: invalid.error.issues[0]?.message ?? "Data absensi tidak valid" };
  }

  try {
    await saveAttendanceRecaps(input);
    refreshAll();
    return { success: true, message: `Rekap absensi ${input.length} siswa berhasil disimpan` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal menyimpan rekap absensi" };
  }
}

export async function createBackupAction(label: string) {
  try {
    await createBackup(label);
    refreshAll();
    return { success: true, message: "Backup berhasil dibuat" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal membuat backup" };
  }
}

export async function restoreBackupAction(payload: unknown, mode: RestoreMode = "merge", confirmed = false) {
  if (!confirmed) return { success: false, message: "Konfirmasi pemulihan diperlukan. Data saat ini belum diubah." };
  try {
    const result = await restoreBackup(payload, mode);
    refreshAll();
    return { success: true, message: `Pemulihan berhasil: ${result.addedStudents} siswa ditambahkan, ${result.keptStudents} siswa lama dipertahankan, dan ${result.addedAttendance} absensi dipulihkan.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Gagal melakukan restore. Data sebelumnya tetap utuh." };
  }
}
