"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ClipboardCheck, Download, FileDown, FileSpreadsheet, Info, Printer, RefreshCw, School, ShieldAlert, Users } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge, Button, Card, CardContent, Input, SectionTitle, Select } from "@/components/ui";
import { SchoolLetterhead } from "@/components/school-letterhead";
import { SchoolAttendanceReportBody, SchoolAttendanceSummaryTable } from "@/components/school-attendance-table";
import { buildSchoolAttendanceSummary, isValidAttendancePeriod, type AttendanceGrouping, type AttendancePeriod, type AttendanceSelection } from "@/lib/attendance-summary";
import { waitForReportImages } from "@/lib/branding";
import { addSchoolLetterheadToPdf } from "@/lib/report-pdf";
import { downloadBlob, formatDateTimeIndonesia, getMonthName } from "@/lib/utils";
import type { AttendanceRecapRecord, SchoolSettingsRecord, StudentRecord } from "@/lib/types";

export function SchoolAttendanceSection({ students, attendanceRecaps, settings, initialPeriod, onOpenClass }: {
  students: StudentRecord[];
  attendanceRecaps: AttendanceRecapRecord[];
  settings: SchoolSettingsRecord;
  initialPeriod?: AttendancePeriod;
  onOpenClass?: (selection: AttendanceSelection) => void;
}) {
  const now = new Date();
  const router = useRouter();
  const reportRef = useRef<HTMLElement>(null);
  const [bulan, setBulan] = useState(initialPeriod?.bulan ?? now.getMonth() + 1);
  const [tahun, setTahun] = useState(String(initialPeriod?.tahun ?? now.getFullYear()));
  const [grouping, setGrouping] = useState<AttendanceGrouping>("rombel");
  const [message, setMessage] = useState("");
  const [pdfPending, setPdfPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const year = Number(tahun);
  const validPeriod = /^\d{4}$/.test(tahun) && isValidAttendancePeriod(bulan, year);
  const summary = useMemo(() => validPeriod ? buildSchoolAttendanceSummary(students, attendanceRecaps, bulan, year) : null, [students, attendanceRecaps, bulan, year, validPeriod]);
  const totals = summary?.totals;
  const filename = `Rekap_Absensi_1_Sekolah_${year}_${String(bulan).padStart(2, "0")}`;
  const periodLabel = validPeriod ? `${getMonthName(bulan)} ${year}` : "Periode belum valid";

  function exportSummaryRows() {
    if (!summary) return [];
    const groups = grouping === "rombel" ? summary.perRombel : summary.perKelas;
    const mapped = groups.map((group) => ({
      Kelas: group.label,
      "Jumlah Siswa": group.jumlahSiswa,
      "Absensi Tersimpan": group.sudahDiisi,
      "Belum Diisi": group.belumDiisi,
      Hadir: group.hadir,
      Sakit: group.sakit,
      Izin: group.izin,
      Alpa: group.alpa,
      "Jumlah Hari Siswa": group.totalHari,
      "Persentase Hadir": group.persentaseHadir === null ? "—" : `${group.persentaseHadir}%`,
    }));
    mapped.push({
      Kelas: "TOTAL SEKOLAH",
      "Jumlah Siswa": summary.totals.jumlahSiswa,
      "Absensi Tersimpan": summary.totals.sudahDiisi,
      "Belum Diisi": summary.totals.belumDiisi,
      Hadir: summary.totals.hadir,
      Sakit: summary.totals.sakit,
      Izin: summary.totals.izin,
      Alpa: summary.totals.alpa,
      "Jumlah Hari Siswa": summary.totals.totalHari,
      "Persentase Hadir": summary.totals.persentaseHadir === null ? "—" : `${summary.totals.persentaseHadir}%`,
    });
    return mapped;
  }

  function exportExcel() {
    if (!summary) return;
    const workbook = XLSX.utils.book_new();
    const makeGroups = (groups: typeof summary.perRombel) => groups.map((group) => ({
      Kelas: group.kelas,
      Rombel: group.rombel || "Gabungan",
      "Jumlah Siswa": group.jumlahSiswa,
      Tersimpan: group.sudahDiisi,
      "Belum Diisi": group.belumDiisi,
      Hadir: group.hadir,
      Sakit: group.sakit,
      Izin: group.izin,
      Alpa: group.alpa,
      "Jumlah Hari": group.totalHari,
      "% Hadir": group.persentaseHadir ?? "—",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportSummaryRows()), "REKAP SEKOLAH");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(makeGroups(summary.perRombel)), "PER ROMBEL");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(makeGroups(summary.perKelas)), "PER KELAS");
    const studentHeaders = ["No", "NIS", "NISN", "Nama Siswa", "Kelas", "Rombel", "Bulan", "Tahun", "Hadir", "Sakit", "Izin", "Alpa", "Jumlah Hari", "Status Pengisian", "Catatan"];
    const studentSheet = XLSX.utils.json_to_sheet(summary.siswa.map((student, index) => ({
      No: index + 1,
      NIS: student.nis,
      NISN: student.nisn,
      "Nama Siswa": student.namaSiswa,
      Kelas: student.kelas,
      Rombel: student.rombel,
      Bulan: bulan,
      Tahun: year,
      Hadir: student.hadir,
      Sakit: student.sakit,
      Izin: student.izin,
      Alpa: student.alpa,
      "Jumlah Hari": student.totalHari,
      "Status Pengisian": student.tersimpan ? "Tersimpan" : "Belum Diisi",
      Catatan: student.catatan,
    })), { header: studentHeaders });
    studentSheet["!cols"] = studentHeaders.map((header) => ({ wch: header === "Nama Siswa" || header === "Catatan" ? 30 : 17 }));
    XLSX.utils.book_append_sheet(workbook, studentSheet, "RINCIAN SISWA");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["REKAP ABSENSI SELURUH SEKOLAH"],
      ["Sekolah", settings.namaSekolah],
      ["NPSN", settings.npsn],
      ["Periode", periodLabel],
      ["Tahun Pelajaran", settings.tahunPelajaran],
      ["Tanggal Export", formatDateTimeIndonesia(new Date())],
      ["Sumber", "Absensi tersimpan dari semua kelas dan rombel"],
      ["Satuan", "Hadir, Sakit, Izin, dan Alpa = akumulasi hari siswa"],
      ["Catatan", "Belum Diisi bukan berarti Alpa. Siswa dihitung sekali pada periode terpilih."],
    ]), "INFORMASI");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
    setMessage("Rekap sekolah dan rincian siswa berhasil diexport ke Excel.");
  }

  function exportCsv() {
    if (!summary) return;
    const data = exportSummaryRows().map((row) => ({ Bulan: bulan, Tahun: year, ...row }));
    const csv = Papa.unparse(data, { escapeFormulae: true });
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
    setMessage("Rekap absensi sekolah berhasil diexport ke CSV.");
  }

  async function exportPdf() {
    if (!summary) return;
    setPdfPending(true);
    setMessage("");
    try {
      const doc = new jsPDF({ orientation: "landscape", format: "a4" });
      const endHeader = await addSchoolLetterheadToPdf(doc, settings);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("REKAP ABSENSI SELURUH SEKOLAH", pageWidth / 2, endHeader, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${periodLabel} | Tahun Pelajaran ${settings.tahunPelajaran || "-"}`, pageWidth / 2, endHeader + 6, { align: "center" });
      doc.text(`Siswa: ${summary.totals.jumlahSiswa} | Tersimpan: ${summary.totals.sudahDiisi} | Belum diisi: ${summary.totals.belumDiisi}`, 14, endHeader + 13);
      const groups = grouping === "rombel" ? summary.perRombel : summary.perKelas;
      autoTable(doc, {
        startY: endHeader + 17,
        head: [["Kelas", "Siswa", "Tersimpan", "Belum", "Hadir", "Sakit", "Izin", "Alpa", "Jumlah Hari", "% Hadir"]],
        body: groups.map((group) => [group.label, group.jumlahSiswa, group.sudahDiisi, group.belumDiisi, group.hadir, group.sakit, group.izin, group.alpa, group.totalHari, group.persentaseHadir === null ? "-" : `${group.persentaseHadir}%`]),
        foot: [["TOTAL SEKOLAH", summary.totals.jumlahSiswa, summary.totals.sudahDiisi, summary.totals.belumDiisi, summary.totals.hadir, summary.totals.sakit, summary.totals.izin, summary.totals.alpa, summary.totals.totalHari, summary.totals.persentaseHadir === null ? "-" : `${summary.totals.persentaseHadir}%`]],
        showFoot: "lastPage",
        margin: { top: 14, right: 14, bottom: 18, left: 14 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42] },
        footStyles: { fillColor: [224, 242, 254], textColor: [15, 23, 42] },
      });
      const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? endHeader + 100;
      let noteY = tableEnd + 8;
      if (noteY + 45 > doc.internal.pageSize.getHeight() - 18) {
        doc.addPage();
        noteY = 20;
      }
      doc.setFontSize(8);
      doc.text("H/S/I/A adalah akumulasi hari siswa. Data belum diisi tidak dianggap alpa.", 14, noteY);
      doc.text("% Hadir = Hadir / (Hadir + Sakit + Izin + Alpa) x 100%. Rekap hanya memakai absensi tersimpan.", 14, noteY + 5);
      const left = 55;
      const right = pageWidth - 60;
      doc.setFontSize(9);
      doc.text("Mengetahui, Kepala Sekolah", left, noteY + 14, { align: "center" });
      doc.text("Operator Sekolah", right, noteY + 14, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(settings.namaKepalaSekolah || "(................................)", left, noteY + 35, { align: "center" });
      doc.text(settings.namaOperator || "(................................)", right, noteY + 35, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${settings.nipKepalaSekolah || "-"}`, left, noteY + 40, { align: "center" });
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 9, { align: "right" });
      }
      doc.save(`${filename}.pdf`);
      setMessage("PDF rekap absensi sekolah berhasil dibuat.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat PDF.");
    } finally {
      setPdfPending(false);
    }
  }

  async function printReport() {
    if (!summary || !reportRef.current) return;
    await waitForReportImages(reportRef.current);
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <style>{"@media print { @page { size: A4 landscape; margin: 12mm; } }"}</style>
      <div className="space-y-6 print:hidden">
        <SectionTitle
          title="Rekap Absensi 1 Sekolah"
          subtitle="Gabungan absensi tersimpan dari seluruh kelas dan rombel A/B. Pengisian tetap dilakukan per kelas, rekap sekolah dihitung otomatis."
          action={<Button disabled={!summary} onClick={() => void printReport()} className="gap-2"><Printer size={17} /> Cetak Rekap Sekolah</Button>}
        />
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="school-attendance-month" className="mb-1.5 block text-sm font-medium text-slate-700">Bulan</label>
                <Select id="school-attendance-month" value={bulan} onChange={(event) => { setBulan(Number(event.target.value)); setMessage(""); }}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{getMonthName(month)}</option>)}
                </Select>
              </div>
              <div>
                <label htmlFor="school-attendance-year" className="mb-1.5 block text-sm font-medium text-slate-700">Tahun</label>
                <Input id="school-attendance-year" type="number" min={2000} max={2100} step={1} value={tahun} onChange={(event) => { setTahun(event.target.value); setMessage(""); }} />
              </div>
              <div>
                <label htmlFor="school-attendance-group" className="mb-1.5 block text-sm font-medium text-slate-700">Rincian Rekap</label>
                <Select id="school-attendance-group" value={grouping} onChange={(event) => setGrouping(event.target.value as AttendanceGrouping)}>
                  <option value="rombel">Per Kelas &amp; Rombel (1A–6B)</option>
                  <option value="kelas">Gabungan per Kelas (A + B)</option>
                </Select>
              </div>
              <div className="flex items-end"><Button variant="secondary" className="w-full gap-2" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Memuat..." : "Muat Data Terbaru"}</Button></div>
            </div>
            {!validPeriod ? <p role="alert" className="text-sm text-rose-700">Masukkan tahun 2000–2100 yang valid.</p> : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-100 text-sky-700"><School size={13} className="mr-1.5" /> Semua Kelas · 1 Sekolah</Badge>
                <Badge>{periodLabel}</Badge>
                <span className="text-xs text-slate-500">Terakhir disimpan: {summary?.updatedAt ? formatDateTimeIndonesia(summary.updatedAt) : "Belum ada absensi tersimpan"}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {summary && totals ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Jumlah Siswa", value: totals.jumlahSiswa, detail: `${summary.jumlahRombel} rombel berisi siswa`, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Total Hadir", value: totals.hadir, detail: "Akumulasi hari siswa", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Total Sakit / Izin / Alpa", value: totals.sakit + totals.izin + totals.alpa, detail: `Sakit ${totals.sakit} · Izin ${totals.izin} · Alpa ${totals.alpa}`, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Persentase Hadir", value: totals.persentaseHadir === null ? "—" : `${totals.persentaseHadir.toLocaleString("id-ID")}%`, detail: `Absensi tersimpan ${totals.sudahDiisi} siswa`, icon: ClipboardCheck, color: "text-sky-600", bg: "bg-sky-50" },
              ].map((item) => {
                const Icon = item.icon;
                return <Card key={item.label}><CardContent><div className="flex items-start justify-between gap-2"><div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></div><div className={`rounded-2xl p-3 ${item.bg}`}><Icon className={item.color} size={22} /></div></div><p className="mt-3 text-xs text-slate-500">{item.detail}</p></CardContent></Card>;
              })}
            </div>

            <div className={`flex items-start gap-3 rounded-2xl border p-4 ${totals.belumDiisi ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-100 bg-sky-50 text-sky-800"}`}>
              <Info size={20} className="mt-0.5 shrink-0" />
              <div className="text-sm leading-6">
                <p className="font-semibold">{totals.belumDiisi ? `Absensi ${totals.belumDiisi} siswa belum diisi pada periode ini.` : totals.jumlahSiswa ? "Absensi seluruh siswa sudah tersimpan untuk periode ini." : "Belum ada siswa atau data absensi pada sekolah ini."}</p>
                <p>Hadir, Sakit, Izin, dan Alpa adalah jumlah hari dari seluruh siswa. Data yang belum diisi tidak dianggap alpa. Simpan isian kelas terlebih dahulu agar masuk rekap sekolah.</p>
              </div>
            </div>

            <Card><CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-semibold text-slate-950">Rekap Semua Kelas · {periodLabel}</h3><p className="text-sm text-slate-500">{grouping === "rombel" ? "Rincian seluruh kelas dan rombel A/B." : "Rombel A dan B digabungkan pada setiap tingkat kelas."}</p></div><Badge className="bg-emerald-100 text-emerald-700">Tersimpan {totals.sudahDiisi} / {totals.jumlahSiswa} siswa</Badge></div>
              <SchoolAttendanceSummaryTable summary={summary} grouping={grouping} onOpenClass={onOpenClass ? (group) => onOpenClass({ kelas: group.kelas, rombel: group.rombel, bulan, tahun: year }) : undefined} />
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button variant="secondary" onClick={exportExcel} className="gap-2"><FileSpreadsheet size={16} /> Export Excel</Button>
                <Button variant="secondary" onClick={exportCsv} className="gap-2"><Download size={16} /> Export CSV</Button>
                <Button variant="secondary" disabled={pdfPending} onClick={() => void exportPdf()} className="gap-2"><FileDown size={16} /> {pdfPending ? "Membuat PDF..." : "Download PDF"}</Button>
                <Button onClick={() => void printReport()} className="gap-2"><Printer size={16} /> Cetak 1 Sekolah</Button>
              </div>
              {message ? <p role="status" className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">{message}</p> : null}
            </CardContent></Card>
          </>
        ) : null}
      </div>

      {summary ? (
        <section className="school-attendance-preview rounded-3xl border border-slate-200 bg-white print:rounded-none print:border-none">
          <h3 className="px-5 py-4 text-sm font-semibold text-slate-700 print:hidden">Pratinjau Laporan Cetak · {periodLabel}</h3>
          <article ref={reportRef} className="print-report p-5 md:p-8 print:p-0">
            <SchoolLetterhead settings={settings} />
            <div className="my-5 text-center"><h2 className="text-lg font-bold uppercase">Rekap Absensi Seluruh Sekolah</h2><p className="text-sm">{periodLabel} • Tahun Pelajaran {settings.tahunPelajaran || "-"}</p></div>
            <SchoolAttendanceReportBody summary={summary} grouping={grouping} />
            <footer className="mt-8 grid grid-cols-2 gap-8 text-center text-sm break-inside-avoid">
              <div><p>Mengetahui,<br />Kepala Sekolah</p><p className="mt-14 font-semibold">{settings.namaKepalaSekolah || "(................................)"}</p><p>NIP. {settings.nipKepalaSekolah || "-"}</p></div>
              <div><p>{settings.kabupaten || "-"}<br />Operator Sekolah</p><p className="mt-14 font-semibold">{settings.namaOperator || "(................................)"}</p></div>
            </footer>
          </article>
        </section>
      ) : null}
    </div>
  );
}
