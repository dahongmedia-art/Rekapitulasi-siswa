import { getCurrentBackup } from "@/lib/backup-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backup = await getCurrentBackup();
    const filename = `Backup_Lengkap_REKAP_SISWA_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ message: "Backup lengkap belum dapat dibuat. Data saat ini tidak diubah." }, { status: 500 });
  }
}
