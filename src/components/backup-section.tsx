"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileCheck2, FolderOpen, RefreshCw, ShieldCheck, Upload, Users, X } from "lucide-react";
import { createBackupAction } from "@/app/actions";
import { Badge, Button, Card, CardContent, SectionTitle, Select } from "@/components/ui";
import { inspectBackup, MAX_BACKUP_FILE_BYTES, type BackupInspection, type BackupSummaryRecord, type RestoreMode } from "@/lib/backup-format";
import { downloadBlob, formatDateTimeIndonesia } from "@/lib/utils";
import type { AttendanceRecapRecord, SchoolSettingsRecord, StudentRecord } from "@/lib/types";

type Preview = BackupInspection & { label: string; backupId?: number };

export function BackupSection({ students, settings, attendanceRecaps, backups, onOpenData, onOpenImport }: {
  students: StudentRecord[];
  settings: SchoolSettingsRecord;
  attendanceRecaps: AttendanceRecapRecord[];
  backups: BackupSummaryRecord[];
  onOpenData?: () => void;
  onOpenImport?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [confirmed, setConfirmed] = useState(false);
  const disabled = busy || pending;

  function showMessage(text: string, failed = false) { setMessage(text); setError(failed); }

  async function download(path: string, filename: string) {
    setBusy(true);
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Backup belum dapat diunduh.");
      }
      downloadBlob(await response.blob(), filename);
      showMessage("Backup berhasil diunduh. Simpan file JSON ini di komputer/HP atau penyimpanan pribadi Anda.");
    } catch (cause) { showMessage(cause instanceof Error ? cause.message : "Gagal mengunduh backup.", true); }
    finally { setBusy(false); }
  }

  function createNow() {
    startTransition(async () => {
      try {
        const result = await createBackupAction(`Backup Manual ${new Date().toLocaleString("id-ID")}`);
        showMessage(result.message, !result.success);
        if (result.success) router.refresh();
      } catch { showMessage("Backup belum dapat dibuat. Data siswa tidak diubah.", true); }
    });
  }

  function openPreview(source: unknown, label: string, backupId?: number) {
    try {
      const inspected = inspectBackup(source);
      setPreview({ ...inspected, label, backupId });
      setMode("merge");
      setConfirmed(false);
      showMessage("Backup valid. Periksa jumlah data dan pilih mode sebelum mengonfirmasi. Belum ada data yang diubah.");
    } catch (cause) {
      setPreview(null);
      showMessage(cause instanceof Error ? cause.message : "File backup tidak valid. Data saat ini tidak diubah.", true);
    }
  }

  async function readBackupFile(file: File) {
    if (file.size > MAX_BACKUP_FILE_BYTES) { showMessage("File backup maksimal 20 MB.", true); return; }
    setBusy(true);
    try { openPreview(JSON.parse(await file.text()), file.name); }
    catch { showMessage("File bukan JSON yang dapat dibaca. Jika file berupa Excel/CSV, gunakan menu Import Data atau Import Absensi.", true); }
    finally { setBusy(false); }
  }

  async function previewHistory(entry: BackupSummaryRecord) {
    setBusy(true);
    try {
      const response = await fetch(`/api/backups/${entry.id}`, { cache: "no-store" });
      const source = await response.json();
      if (!response.ok) throw new Error(source.message || "Backup tidak ditemukan.");
      openPreview(source, entry.label, entry.id);
    } catch (cause) { showMessage(cause instanceof Error ? cause.message : "Backup riwayat belum dapat dibuka.", true); }
    finally { setBusy(false); }
  }

  async function restore() {
    if (!preview || !confirmed) return;
    setBusy(true);
    try {
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, mode, ...(preview.backupId ? { backupId: preview.backupId } : { backup: preview.backup }) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Pemulihan belum berhasil.");
      setPreview(null);
      setConfirmed(false);
      showMessage(`${result.message} Salinan kondisi sebelum pemulihan tersedia di riwayat backup.`);
      router.refresh();
    } catch (cause) { showMessage(cause instanceof Error ? cause.message : "Pemulihan gagal. Data sebelumnya tetap utuh.", true); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Backup & Pemulihan Data" subtitle="Periksa data yang masih tersimpan, unduh salinan lengkap, atau buka kembali backup sebelum memulihkannya." action={<Button variant="secondary" disabled={disabled} className="gap-2" onClick={() => router.refresh()}><RefreshCw size={16} /> Periksa Ulang</Button>} />

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-start gap-3"><ShieldCheck size={24} className="shrink-0 text-sky-600" /><div><h3 className="font-bold text-slate-950">Status Penyimpanan Saat Ini</h3><p className="mt-1 text-sm text-slate-600">{settings.namaSekolah} · NPSN {settings.npsn || "-"}</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[{ label: "Data siswa tersimpan", value: students.length }, { label: "Rekap absensi tersimpan", value: attendanceRecaps.length }, { label: "Salinan backup tersedia", value: backups.length }].map((item) => <div key={item.label} className="rounded-2xl border border-white bg-white/80 p-4"><p className="text-3xl font-bold text-slate-950">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.label}</p></div>)}
        </div>
        {students.length ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-sky-900"><strong>{students.length} siswa masih tersedia.</strong> Jika daftar tampak kosong, buka Data Siswa lalu reset filter.</p><Button className="gap-2" onClick={onOpenData}><Users size={16} /> Buka Data Siswa</Button></div> : <p className="mt-4 text-sm text-sky-900">Belum ada siswa di penyimpanan yang sedang dibuka. Periksa riwayat backup atau pilih file backup dari perangkat.</p>}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><div><strong>Simpan salinan di perangkat Anda.</strong> Tautan preview dan backup pada server preview bersifat sementara. Backup server tidak menjamin data tetap ada jika lingkungan preview berakhir. Klik <strong>Download Backup Lengkap</strong> dan simpan file JSON di komputer/HP atau penyimpanan pribadi.</div></div>

      <Card><CardContent className="space-y-4">
        <div><h3 className="text-lg font-semibold text-slate-950">Amankan atau Buka Kembali Data</h3><p className="mt-1 text-sm text-slate-500">Backup lengkap mencakup siswa, absensi semua kelas/periode, pengaturan sekolah, dan logo. Referensi absensi dipulihkan berdasarkan NIS/NISN.</p></div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={disabled} className="gap-2" onClick={() => void download("/api/backups/download", `Backup_Lengkap_REKAP_SISWA_${Date.now()}.json`)}><Download size={17} /> Download Backup Lengkap</Button>
          <Button variant="secondary" disabled={disabled} className="gap-2" onClick={createNow}><DatabaseBackup size={17} /> Buat Salinan di Server</Button>
          <label className={`inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-violet-700"}`}><Upload size={17} /> Buka File Backup JSON<input type="file" accept=".json,application/json" className="sr-only" disabled={disabled} aria-label="Pilih file backup JSON" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void readBackupFile(file); event.currentTarget.value = ""; }} /></label>
          {onOpenImport ? <Button variant="ghost" disabled={disabled} className="gap-2" onClick={onOpenImport}><FolderOpen size={17} /> Punya File Excel/CSV?</Button> : null}
        </div>
        <p className="text-xs text-slate-500">Membuka file atau pratinjau backup tidak mengubah data. Pemulihan baru berjalan setelah konfirmasi.</p>
      </CardContent></Card>

      {message ? <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</div> : null}

      {preview ? <Card><CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><FileCheck2 size={20} className="text-emerald-600" /> Pratinjau Pemulihan</h3><p className="mt-1 break-words text-sm text-slate-500">{preview.label}</p></div><Button variant="ghost" disabled={disabled} onClick={() => { setPreview(null); setConfirmed(false); }} aria-label="Tutup pratinjau"><X size={18} /></Button></div>
        <div className="flex flex-wrap gap-2"><Badge className="bg-emerald-100 text-emerald-700">{preview.backup.students.length} siswa</Badge><Badge>{preview.backup.attendance.length} absensi</Badge><Badge>{preview.backup.settings.namaSekolah}</Badge><Badge>{formatDateTimeIndonesia(preview.backup.exportedAt)}</Badge></div>
        {!preview.includesAttendance ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ini backup format lama, hanya berisi siswa dan pengaturan. Absensi tidak ada di file ini. Gunakan mode gabung untuk mempertahankan absensi yang saat ini tersimpan.</p> : null}
        <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{["NIS", "NISN", "Nama Siswa", "Kelas"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{preview.backup.students.slice(0, 5).map((student) => <tr key={student.nisn} className="border-t border-slate-100"><td className="px-3 py-2">{student.nis}</td><td className="px-3 py-2">{student.nisn}</td><td className="px-3 py-2">{student.namaSiswa}</td><td className="px-3 py-2">{student.kelas}{student.rombel}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-500">Pratinjau menampilkan maksimal 5 siswa. Seluruh isi file sudah divalidasi sebelum pemulihan.</p>
        <div><label htmlFor="restore-mode" className="mb-2 block text-sm font-semibold text-slate-700">Mode Pemulihan</label><Select id="restore-mode" value={mode} disabled={disabled} onChange={(event) => { setMode(event.target.value as RestoreMode); setConfirmed(false); }}><option value="merge">Gabungkan — pertahankan data saat ini (disarankan)</option><option value="replace">Ganti seluruh siswa, absensi, dan pengaturan</option></Select></div>
        <p className={`rounded-xl p-3 text-sm ${mode === "replace" ? "bg-rose-50 text-rose-800" : "bg-sky-50 text-sky-800"}`}>{mode === "merge" ? "Siswa baru dan absensi yang belum ada akan ditambahkan. Siswa, absensi periode yang sudah ada, dan pengaturan saat ini tidak ditimpa." : "PERHATIAN: seluruh siswa dan absensi saat ini akan diganti dengan isi backup. Pengaturan juga diganti. Salinan sebelum pemulihan dibuat otomatis di riwayat."}</p>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} disabled={disabled} onChange={(event) => setConfirmed(event.target.checked)} /><span>Saya sudah memeriksa isi backup dan menyetujui {mode === "replace" ? "penggantian seluruh data" : "penggabungan tanpa menimpa data lama"}.</span></label>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={disabled} onClick={() => { setPreview(null); setConfirmed(false); }}>Batalkan Pemulihan</Button><Button variant={mode === "replace" ? "danger" : "primary"} disabled={disabled || !confirmed || !preview.backup.students.length} className="gap-2" onClick={() => void restore()}><CheckCircle2 size={16} /> {busy ? "Memulihkan..." : "Konfirmasi & Pulihkan"}</Button></div>
      </CardContent></Card> : null}

      <Card><CardContent className="space-y-4"><h3 className="text-lg font-semibold text-slate-950">Riwayat Backup yang Masih Tersedia</h3><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 text-left text-slate-500"><tr><th className="px-3 py-3">Backup</th><th className="px-3 py-3">Tanggal & Waktu Backup</th><th className="px-3 py-3">Siswa</th><th className="px-3 py-3">Absensi</th><th className="px-3 py-3">Aksi</th></tr></thead><tbody>{backups.length ? backups.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="px-3 py-3"><p className="font-medium text-slate-900">{entry.label}</p><span className="text-xs text-slate-500">{entry.isManual ? "Manual" : "Salinan pengaman otomatis"}</span></td><td className="whitespace-nowrap px-3 py-3">{formatDateTimeIndonesia(entry.createdAt)}</td><td className="px-3 py-3">{entry.studentsCount}</td><td className="px-3 py-3">{entry.includesAttendance ? entry.attendanceCount : "Tidak disertakan (backup lama)"}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={disabled} className="gap-1.5 text-xs" onClick={() => void download(`/api/backups/${entry.id}`, `Backup_REKAP_SISWA_${entry.id}.json`)}><Download size={14} /> Unduh</Button><Button variant="ghost" disabled={disabled} className="gap-1.5 text-xs text-sky-700" onClick={() => void previewHistory(entry)}><FolderOpen size={14} /> Pratinjau & Pulihkan</Button></div></td></tr>) : <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Belum ada riwayat backup pada penyimpanan ini. File backup yang sudah diunduh sebelumnya tetap bisa dibuka dari perangkat.</td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  );
}
