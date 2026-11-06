import { getBackupEntry } from "@/lib/backup-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backupId = Number(id);
  if (!Number.isSafeInteger(backupId) || backupId < 1) return Response.json({ message: "Nomor backup tidak valid." }, { status: 400 });
  const entry = await getBackupEntry(backupId);
  if (!entry) return Response.json({ message: "Backup tidak ditemukan pada penyimpanan ini." }, { status: 404 });
  return new Response(JSON.stringify(entry.payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="Backup_REKAP_SISWA_${entry.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
