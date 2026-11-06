"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendancePeriod, AttendanceSelection } from "@/lib/attendance-summary";
import { CalendarCheck, Clock3, FileText, Printer, Save, Search, ShieldAlert, School } from "lucide-react";
import { saveAttendanceAction } from "@/app/actions";
import { AttendanceTransferPanel, type AttendanceTransferRow } from "@/components/attendance-transfer-panel";
import { Badge, Button, Card, CardContent, Input, SectionTitle, Select } from "@/components/ui";
import { CLASS_OPTIONS, ROMBEL_OPTIONS } from "@/lib/constants";
import { getMonthName } from "@/lib/utils";
import { buildSchoolLetterheadHtml, SCHOOL_LETTERHEAD_CSS, waitForReportImages } from "@/lib/branding";
import type { AttendanceInput, AttendanceRecapRecord, SchoolSettingsRecord, StudentRecord } from "@/lib/types";

type AttendanceRow = AttendanceInput & {
  nis: string;
  nisn: string;
  namaSiswa: string;
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function AttendanceSection({
  students,
  attendanceRecaps,
  settings,
  initialSelection,
  onOpenSchool,
}: {
  students: StudentRecord[];
  attendanceRecaps: AttendanceRecapRecord[];
  settings: SchoolSettingsRecord;
  initialSelection?: AttendanceSelection;
  onOpenSchool?: (period: AttendancePeriod) => void;
}) {
  const now = new Date();
  const router = useRouter();
  const [kelas, setKelas] = useState(initialSelection?.kelas ?? "1");
  const [rombel, setRombel] = useState(initialSelection?.rombel ?? "A");
  const [bulan, setBulan] = useState(initialSelection?.bulan ?? now.getMonth() + 1);
  const [tahun, setTahun] = useState(initialSelection?.tahun ?? now.getFullYear());
  const [query, setQuery] = useState("");
  const [hariEfektif, setHariEfektif] = useState(20);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const existingForPeriod = attendanceRecaps.filter(
      (item) => item.kelas === kelas && item.rombel.toUpperCase() === rombel && item.bulan === bulan && item.tahun === tahun
    );
    const existingMap = new Map(existingForPeriod.map((item) => [item.studentId, item]));
    const currentStudents = students.filter(
      (student) => student.kelas === kelas && student.rombel.trim().toUpperCase() === rombel
    );
    const mergedStudents = new Map<number, Pick<StudentRecord, "id" | "nis" | "nisn" | "namaSiswa" | "rombel">>();

    currentStudents.forEach((student) => mergedStudents.set(student.id, student));
    existingForPeriod.forEach((item) => {
      if (!mergedStudents.has(item.studentId)) {
        mergedStudents.set(item.studentId, {
          id: item.studentId,
          nis: item.nis,
          nisn: item.nisn,
          namaSiswa: item.namaSiswa,
          rombel: item.rombel,
        });
      }
    });

    const nextRows = Array.from(mergedStudents.values())
      .sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa, "id"))
      .map((student) => {
        const existing = existingMap.get(student.id);
        return {
          studentId: student.id,
          nis: student.nis,
          nisn: student.nisn,
          namaSiswa: student.namaSiswa,
          kelas,
          rombel,
          bulan,
          tahun,
          hadir: existing?.hadir ?? 0,
          sakit: existing?.sakit ?? 0,
          izin: existing?.izin ?? 0,
          alpa: existing?.alpa ?? 0,
          catatan: existing?.catatan ?? "",
        };
      });

    setRows(nextRows);
    setMessage("");
  }, [attendanceRecaps, students, kelas, rombel, bulan, tahun]);

  const displayedRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter(
      (row) =>
        row.namaSiswa.toLowerCase().includes(normalized) ||
        row.nis.toLowerCase().includes(normalized) ||
        row.nisn.toLowerCase().includes(normalized)
    );
  }, [query, rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          hadir: acc.hadir + row.hadir,
          sakit: acc.sakit + row.sakit,
          izin: acc.izin + row.izin,
          alpa: acc.alpa + row.alpa,
        }),
        { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
      ),
    [rows]
  );

  function updateRow(studentId: number, field: "hadir" | "sakit" | "izin" | "alpa" | "catatan", value: string) {
    setRows((previous) =>
      previous.map((row) => {
        if (row.studentId !== studentId) return row;
        if (field === "catatan") return { ...row, catatan: value };
        const parsed = Math.max(0, Math.min(31, Number(value) || 0));
        return { ...row, [field]: parsed };
      })
    );
  }

  function fillAllPresent() {
    setRows((previous) => previous.map((row) => ({ ...row, hadir: Math.max(0, Math.min(31, hariEfektif)) })));
    setMessage(`Kolom hadir seluruh siswa diisi ${hariEfektif} hari. Klik Simpan Rekap untuk menyimpan.`);
  }

  function clearAll() {
    if (!window.confirm("Kosongkan seluruh isian absensi pada kelas dan periode ini?")) return;
    setRows((previous) => previous.map((row) => ({ ...row, hadir: 0, sakit: 0, izin: 0, alpa: 0, catatan: "" })));
    setMessage("Isian dikosongkan. Klik Simpan Rekap untuk menyimpan perubahan.");
  }

  function handleSave() {
    if (!rows.length) {
      setMessage("Belum ada siswa pada kelas ini.");
      return;
    }

    const invalid = rows.find((row) => row.hadir + row.sakit + row.izin + row.alpa > 31);
    if (invalid) {
      setMessage(`Jumlah hari ${invalid.namaSiswa} melebihi 31 hari. Periksa kembali isian.`);
      return;
    }

    const payload: AttendanceInput[] = rows.map(({ nis, nisn, namaSiswa, ...attendance }) => attendance);
    startTransition(async () => {
      try {
        const result = await saveAttendanceAction(payload);
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch {
        setMessage("Data absensi belum dapat disimpan. Periksa koneksi lalu coba kembali.");
      }
    });
  }

  function openSchoolRecap() {
    if (!onOpenSchool) return;
    const saved = new Map(attendanceRecaps.filter((item) => item.kelas === kelas && item.rombel === rombel && item.bulan === bulan && item.tahun === tahun).map((item) => [item.studentId, item]));
    const hasChanges = rows.some((row) => {
      const previous = saved.get(row.studentId);
      return row.hadir !== (previous?.hadir ?? 0) || row.sakit !== (previous?.sakit ?? 0) || row.izin !== (previous?.izin ?? 0) || row.alpa !== (previous?.alpa ?? 0) || row.catatan !== (previous?.catatan ?? "");
    });
    if (hasChanges && !window.confirm("Ada perubahan absensi yang belum disimpan. Rekap sekolah hanya memakai data tersimpan. Lanjutkan tanpa menyimpan perubahan?")) return;
    onOpenSchool({ bulan, tahun });
  }

  function handlePrint() {
    if (!rows.length) {
      setMessage("Belum ada data untuk dicetak.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      setMessage("Jendela cetak diblokir browser. Izinkan pop-up lalu coba kembali.");
      return;
    }

    const tableRows = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.nis)}</td>
            <td>${escapeHtml(row.nisn)}</td>
            <td class="name">${escapeHtml(row.namaSiswa)}</td>
            <td>${escapeHtml(row.rombel)}</td>
            <td>${row.hadir}</td>
            <td>${row.sakit}</td>
            <td>${row.izin}</td>
            <td>${row.alpa}</td>
            <td>${row.hadir + row.sakit + row.izin + row.alpa}</td>
            <td class="notes">${escapeHtml(row.catatan || "-")}</td>
          </tr>`
      )
      .join("");

    const report = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Rekap Absensi Kelas ${escapeHtml(`${kelas}${rombel}`)} - ${escapeHtml(getMonthName(bulan))} ${tahun}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
            header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
            h1 { font-size: 20px; margin: 0 0 4px; text-transform: uppercase; }
            header p, .title p { margin: 2px 0; }
            .title { text-align: center; margin: 12px 0; }
            .title h2 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #64748b; padding: 5px; text-align: center; vertical-align: middle; }
            th { background: #e2e8f0; }
            td.name, td.notes { text-align: left; }
            tfoot td { font-weight: 700; background: #f1f5f9; }
            .signatures { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; page-break-inside: avoid; }
            .signature { width: 32%; }
            .space { height: 55px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 8px; }
            ${SCHOOL_LETTERHEAD_CSS}
          </style>
        </head>
        <body>
          ${buildSchoolLetterheadHtml(settings)}
          <div class="title">
            <h2>Rekapitulasi Absensi Siswa per Kelas</h2>
            <p>Kelas ${escapeHtml(`${kelas}${rombel}`)} • ${escapeHtml(getMonthName(bulan))} ${tahun} • Tahun Pelajaran ${escapeHtml(settings.tahunPelajaran || "-")}</p>
          </div>
          <div class="meta">
            <span>Jumlah siswa: ${rows.length}</span>
          </div>
          <table>
            <thead>
              <tr><th>No</th><th>NIS</th><th>NISN</th><th>Nama Siswa</th><th>Rombel</th><th>H</th><th>S</th><th>I</th><th>A</th><th>Jumlah</th><th>Catatan</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr><td colspan="5">TOTAL KELAS</td><td>${totals.hadir}</td><td>${totals.sakit}</td><td>${totals.izin}</td><td>${totals.alpa}</td><td>${totals.hadir + totals.sakit + totals.izin + totals.alpa}</td><td></td></tr>
            </tfoot>
          </table>
          <div class="signatures">
            <div class="signature"><p>Mengetahui,<br/>Kepala Sekolah</p><div class="space"></div><strong>${escapeHtml(settings.namaKepalaSekolah || "Kepala Sekolah")}</strong><p>NIP. ${escapeHtml(settings.nipKepalaSekolah || "-")}</p></div>
            <div class="signature"><p>Operator Sekolah</p><div class="space"></div><strong>${escapeHtml(settings.namaOperator || "Operator")}</strong></div>
            <div class="signature"><p>${escapeHtml(settings.kabupaten || "-")}<br/>Wali Kelas ${escapeHtml(`${kelas}${rombel}`)}</p><div class="space"></div><strong>(................................)</strong></div>
          </div>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(report);
    printWindow.document.close();
    void waitForReportImages(printWindow.document).then(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Rekap Absensi per Kelas"
        subtitle="Pilih tingkat kelas dan Rombel A/B, lalu isi Hadir, Sakit, Izin, dan Alpa. Data setiap rombel tersimpan terpisah untuk guru masing-masing."
        action={
          <div className="flex flex-wrap gap-2">
            {onOpenSchool ? <Button onClick={openSchoolRecap} disabled={pending} className="gap-2"><School size={17} /> Rekap 1 Sekolah</Button> : null}
            <Button variant="secondary" onClick={handlePrint}>
              <Printer className="mr-2" size={17} /> Cetak Kelas
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Tingkat Kelas</label>
              <Select value={kelas} onChange={(event) => setKelas(event.target.value)}>
                {CLASS_OPTIONS.map((item) => (
                  <option key={item} value={item}>Kelas {item}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Rombel</label>
              <Select value={rombel} onChange={(event) => setRombel(event.target.value)}>
                {ROMBEL_OPTIONS.map((item) => (
                  <option key={item} value={item}>Rombel {item}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Bulan</label>
              <Select value={bulan} onChange={(event) => setBulan(Number(event.target.value))}>
                {MONTHS.map((item) => (
                  <option key={item} value={item}>{getMonthName(item)}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Tahun</label>
              <Input type="number" min={2000} max={2100} value={tahun} onChange={(event) => setTahun(Number(event.target.value) || now.getFullYear())} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Hari Efektif</label>
              <Input type="number" min={0} max={31} value={hariEfektif} onChange={(event) => setHariEfektif(Math.max(0, Math.min(31, Number(event.target.value) || 0)))} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={fillAllPresent}>Isi Hadir Semua</Button>
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="ghost" onClick={clearAll}>Kosongkan</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge className="bg-sky-100 text-sky-700">Periode: {getMonthName(bulan)} {tahun}</Badge>
            <Badge className="bg-violet-100 text-violet-700">Kelas {kelas}{rombel}</Badge>
            <Badge>{rows.length} siswa</Badge>
            <span>H = Hadir, S = Sakit, I = Izin, A = Alpa.</span>
          </div>
        </CardContent>
      </Card>

      <AttendanceTransferPanel
        rows={rows}
        kelas={kelas}
        rombel={rombel}
        bulan={bulan}
        tahun={tahun}
        onImported={(importedRows: AttendanceTransferRow[], importMessage: string) => {
          setRows(importedRows);
          setMessage(importMessage);
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Hadir", value: totals.hadir, icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Sakit", value: totals.sakit, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Izin", value: totals.izin, icon: Clock3, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Total Alpa", value: totals.alpa, icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Jumlah Siswa", value: rows.length, icon: Search, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p></div>
                <div className={`rounded-2xl p-3 ${item.bg}`}><Icon className={item.color} size={22} /></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Isian Absensi Kelas {kelas}{rombel}</h3>
              <p className="text-sm text-slate-500">Data disimpan per siswa untuk periode {getMonthName(bulan)} {tahun}.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <Input className="pl-10" placeholder="Cari nama, NIS, atau NISN" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">No</th>
                  <th className="px-3 py-3">NISN</th>
                  <th className="min-w-48 px-3 py-3">Nama Siswa</th>
                  <th className="px-3 py-3">Rombel</th>
                  <th className="w-24 px-3 py-3 text-center">Hadir</th>
                  <th className="w-24 px-3 py-3 text-center">Sakit</th>
                  <th className="w-24 px-3 py-3 text-center">Izin</th>
                  <th className="w-24 px-3 py-3 text-center">Alpa</th>
                  <th className="px-3 py-3 text-center">Jumlah</th>
                  <th className="min-w-56 px-3 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length ? (
                  displayedRows.map((row) => {
                    const actualIndex = rows.findIndex((item) => item.studentId === row.studentId);
                    const total = row.hadir + row.sakit + row.izin + row.alpa;
                    return (
                      <tr key={row.studentId} className="border-b border-slate-100 align-middle">
                        <td className="px-3 py-3">{actualIndex + 1}</td>
                        <td className="px-3 py-3">{row.nisn}</td>
                        <td className="px-3 py-3 font-medium text-slate-950">{row.namaSiswa}</td>
                        <td className="px-3 py-3">{row.rombel}</td>
                        {(["hadir", "sakit", "izin", "alpa"] as const).map((field) => (
                          <td key={field} className="px-2 py-2">
                            <Input className="min-w-16 text-center" type="number" min={0} max={31} value={row[field]} onChange={(event) => updateRow(row.studentId, field, event.target.value)} />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-semibold">
                          <span className={total > 31 ? "text-rose-600" : "text-slate-700"}>{total}</span>
                        </td>
                        <td className="px-2 py-2">
                          <Input placeholder="Catatan (opsional)" value={row.catatan} onChange={(event) => updateRow(row.studentId, "catatan", event.target.value)} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={10} className="px-3 py-12 text-center text-slate-500">Belum ada siswa di Kelas {kelas}{rombel}. Atur rombel siswa melalui menu Data Siswa atau periksa pencarian.</td></tr>
                )}
              </tbody>
              {rows.length ? (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-950">
                    <td colSpan={4} className="px-3 py-3">TOTAL KELAS</td>
                    <td className="px-3 py-3 text-center">{totals.hadir}</td>
                    <td className="px-3 py-3 text-center">{totals.sakit}</td>
                    <td className="px-3 py-3 text-center">{totals.izin}</td>
                    <td className="px-3 py-3 text-center">{totals.alpa}</td>
                    <td className="px-3 py-3 text-center">{totals.hadir + totals.sakit + totals.izin + totals.alpa}</td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          {message ? (
            <div className={`rounded-2xl px-4 py-3 text-sm ${message.toLowerCase().includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
              {message}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Simpan setelah selesai mengubah data. Data periode lama tetap tersimpan.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handlePrint}><Printer className="mr-2" size={17} /> Cetak</Button>
              <Button disabled={pending || !rows.length} onClick={handleSave}><Save className="mr-2" size={17} /> {pending ? "Menyimpan..." : "Simpan Rekap"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
