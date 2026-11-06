"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button, Card, CardContent, SectionTitle, Select } from "@/components/ui";
import { SchoolLetterhead } from "@/components/school-letterhead";
import { CLASS_OPTIONS, GENDER_OPTIONS } from "@/lib/constants";
import { downloadBlob, formatDateIndonesia } from "@/lib/utils";
import { waitForReportImages } from "@/lib/branding";
import { addSchoolLetterheadToPdf } from "@/lib/report-pdf";
import type { SchoolSettingsRecord, StudentRecord } from "@/lib/types";

export function ExportSection({ students, settings }: { students: StudentRecord[]; settings: SchoolSettingsRecord }) {
  const [kelas, setKelas] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [usia, setUsia] = useState("");
  const [pdfPending, setPdfPending] = useState(false);
  const [message, setMessage] = useState("");

  const ageOptions = useMemo(() => Array.from(new Set(students.map((item) => item.usia))).sort((a, b) => a - b), [students]);
  const filtered = useMemo(
    () => students
      .filter((item) => (!kelas ? true : item.kelas === kelas))
      .filter((item) => (!jenisKelamin ? true : item.jenisKelamin === jenisKelamin))
      .filter((item) => (!usia ? true : String(item.usia) === usia)),
    [students, kelas, jenisKelamin, usia]
  );
  const filterLabel = [kelas ? `Kelas ${kelas}` : "Semua Kelas", jenisKelamin, usia ? `Usia ${usia} Tahun` : ""].filter(Boolean).join(" · ");

  function mapRows() {
    return filtered.map((item, index) => ({
      No: index + 1,
      NIS: item.nis,
      NISN: item.nisn,
      "Nama Siswa": item.namaSiswa,
      "Jenis Kelamin": item.jenisKelamin,
      "Tempat Lahir": item.tempatLahir,
      "Tanggal Lahir": formatDateIndonesia(item.tanggalLahir),
      Usia: item.usia,
      Kelas: item.kelas,
      Rombel: item.rombel,
      Alamat: item.alamat,
      "Nama Orang Tua/Wali": item.namaOrangTua,
      "Status Siswa": item.statusSiswa,
    }));
  }

  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(mapRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Data Siswa");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Export_Data_Siswa.xlsx");
  }

  function exportCsv() {
    const csv = Papa.unparse(mapRows());
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), "Export_Data_Siswa.csv");
  }

  async function exportPdf() {
    setPdfPending(true);
    setMessage("");
    try {
      const doc = new jsPDF({ orientation: "landscape", format: "a4" });
      const headerEnd = await addSchoolLetterheadToPdf(doc, settings);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("LAPORAN DATA SISWA", pageWidth / 2, headerEnd, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${filterLabel} | Tahun Pelajaran: ${settings.tahunPelajaran || "-"}`, pageWidth / 2, headerEnd + 6, { align: "center" });
      doc.text(`Total: ${filtered.length} siswa`, pageWidth / 2, headerEnd + 11, { align: "center" });
      autoTable(doc, {
        startY: headerEnd + 17,
        margin: { top: 14, right: 14, bottom: 17, left: 14 },
        head: [["No", "NIS", "NISN", "Nama Siswa", "Jenis Kelamin", "Tempat, Tanggal Lahir", "Usia", "Kelas", "Rombel", "Status"]],
        body: filtered.map((item, index) => [index + 1, item.nis, item.nisn, item.namaSiswa, item.jenisKelamin, `${item.tempatLahir}, ${formatDateIndonesia(item.tanggalLahir)}`, item.usia, item.kelas, item.rombel, item.statusSiswa]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      const count = doc.getNumberOfPages();
      for (let page = 1; page <= count; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const height = doc.internal.pageSize.getHeight();
        doc.text(settings.namaSekolah || "REKAP SISWA", 14, height - 9);
        doc.text(`Halaman ${page} dari ${count}`, pageWidth - 14, height - 9, { align: "right" });
      }
      doc.save("Export_Data_Siswa.pdf");
      setMessage("PDF berhasil dibuat dengan kop sekolah dan logo yang tersedia.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat PDF.");
    } finally {
      setPdfPending(false);
    }
  }

  async function printTable() {
    const report = document.querySelector<HTMLElement>(".export-print-report");
    if (report) await waitForReportImages(report);
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <style>{"@media print { @page { size: A4 landscape; margin: 12mm; } }"}</style>
      <div className="space-y-6 print:hidden">
        <SectionTitle title="Export Data" subtitle="Export Excel, CSV, PDF, atau cetak tabel dengan kop sekolah dan logo berdasarkan filter terbaru." />
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Select aria-label="Kelas" value={kelas} onChange={(event) => setKelas(event.target.value)}>
                <option value="">Semua Kelas</option>
                {CLASS_OPTIONS.map((item) => <option key={item} value={item}>Kelas {item}</option>)}
              </Select>
              <Select aria-label="Jenis kelamin" value={jenisKelamin} onChange={(event) => setJenisKelamin(event.target.value)}>
                <option value="">Semua Jenis Kelamin</option>
                {GENDER_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
              <Select aria-label="Usia" value={usia} onChange={(event) => setUsia(event.target.value)}>
                <option value="">Semua Usia</option>
                {ageOptions.map((item) => <option key={item} value={String(item)}>{item} Tahun</option>)}
              </Select>
              <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-600">Total data: {filtered.length}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportExcel}>📤 Export Excel</Button>
              <Button variant="secondary" onClick={exportCsv}>📤 Export CSV</Button>
              <Button variant="secondary" disabled={pdfPending} onClick={() => void exportPdf()}>{pdfPending ? "Membuat PDF..." : "📤 Export PDF"}</Button>
              <Button variant="secondary" onClick={() => void printTable()}>🖨️ Cetak Tabel Langsung</Button>
            </div>
            {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <article className="export-print-report print-report mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 md:p-8 print:max-w-none print:rounded-none print:border-none print:p-0">
        <SchoolLetterhead settings={settings} />
        <div className="my-5 text-center">
          <h2 className="text-lg font-bold uppercase">Laporan Data Siswa</h2>
          <p className="text-sm">{filterLabel} • Tahun Pelajaran {settings.tahunPelajaran || "-"}</p>
          <p className="text-xs text-slate-500">Total: {filtered.length} siswa</p>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-full border-collapse text-xs">
            <thead><tr>{["No", "NIS", "NISN", "Nama Siswa", "Jenis Kelamin", "Tempat, Tanggal Lahir", "Usia", "Kelas", "Status"].map((title) => <th key={title} className="border border-slate-300 px-2 py-2">{title}</th>)}</tr></thead>
            <tbody>
              {filtered.length ? filtered.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.nis}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.nisn}</td>
                  <td className="border border-slate-300 px-2 py-2 font-medium">{item.namaSiswa}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.jenisKelamin}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.tempatLahir}, {formatDateIndonesia(item.tanggalLahir)}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.usia}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.kelas}{item.rombel}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.statusSiswa}</td>
                </tr>
              )) : <tr><td colSpan={9} className="border border-slate-300 py-8 text-center text-slate-500">Belum ada data siswa untuk filter ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
