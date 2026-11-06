import { revalidatePath } from "next/cache";
import { getBackupEntry, restoreFullBackup } from "@/lib/backup-store";
import { MAX_BACKUP_FILE_BYTES } from "@/lib/backup-format";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return Response.json({ message: "Permintaan pemulihan tidak diizinkan." }, { status: 403 });
    } catch {
      return Response.json({ message: "Asal permintaan pemulihan tidak valid." }, { status: 403 });
    }
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BACKUP_FILE_BYTES) return Response.json({ message: "File backup maksimal 20 MB." }, { status: 413 });
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BACKUP_FILE_BYTES) return Response.json({ message: "File backup maksimal 20 MB." }, { status: 413 });
    const input = JSON.parse(text);
    if (input.confirmed !== true) return Response.json({ message: "Konfirmasi pemulihan diperlukan. Data saat ini belum diubah." }, { status: 400 });
    if (input.mode !== "merge" && input.mode !== "replace") return Response.json({ message: "Pilih mode pemulihan yang valid." }, { status: 400 });
    let source: unknown = input.backup;
    if (input.backupId !== undefined) {
      if (!Number.isSafeInteger(input.backupId) || input.backupId < 1) return Response.json({ message: "Nomor backup tidak valid." }, { status: 400 });
      const entry = await getBackupEntry(input.backupId);
      if (!entry) return Response.json({ message: "Backup riwayat tidak ditemukan." }, { status: 404 });
      source = entry.payload;
    }
    const result = await restoreFullBackup(source, input.mode);
    revalidatePath("/");
    return Response.json({ success: true, message: `Pemulihan selesai. ${result.addedStudents} siswa ditambahkan, ${result.keptStudents} siswa lama dipertahankan, ${result.addedAttendance} absensi dipulihkan.`, result });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Pemulihan gagal. Data sebelumnya tetap utuh." }, { status: 400 });
  }
}
