"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileDown, FileSpreadsheet, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import Papa, { type ParseResult } from "papaparse";
import { saveAttendanceAction } from "@/app/actions";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { downloadBlob, getMonthName } from "@/lib/utils";
import type { AttendanceInput } from "@/lib/types";

export type AttendanceTransferRow = AttendanceInput & {
  nis: string;
  nisn: string;
  namaSiswa: string;
};

type ImportPreview = {
  rowNumber: number;
  studentId: number | null;
  nis: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  rombel: string;
  bulan: number;
  tahun: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  catatan: string;
  errors: string[];
};

const ATTENDANCE_HEADERS = [
  "No",
  "NIS",
  "NISN",
  "Nama Siswa",
  "Kelas",
  "Rombel",
  "Bulan",
  "Tahun",
  "Hadir",
  "Sakit",
  "Izin",
  "Alpa",
  "Catatan",
] as const;

function toNumber(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function exportRows(rows: AttendanceTransferRow[]) {
  return rows.map((item, index) => ({
    No: index + 1,
    NIS: item.nis,
    NISN: item.nisn,
    "Nama Siswa": item.namaSiswa,
    Kelas: item.kelas,
    Rombel: item.rombel,
    Bulan: item.bulan,
    Tahun: item.tahun,
    Hadir: item.hadir,
    Sakit: item.sakit,
    Izin: item.izin,
    Alpa: item.alpa,
    Catatan: item.catatan,
  }));
}

export function AttendanceTransferPanel({
  rows,
  kelas,
  rombel,
  bulan,
  tahun,
  onImported,
}: {
  rows: AttendanceTransferRow[];
  kelas: string;
  rombel: string;
  bulan: number;
  tahun: number;
  onImported: (rows: AttendanceTransferRow[], message: string) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const validRows = preview.filter((item) => item.errors.length === 0 && item.studentId !== null);
  const invalidRows = preview.length - validRows.length;

  function downloadTemplate() {
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(exportRows(rows), { header: [...ATTENDANCE_HEADERS] });
    dataSheet["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 9 },
      { wch: 9 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 30 },
    ];

    const instructions = XLSX.utils.aoa_to_sheet([
      ["PETUNJUK IMPORT ABSENSI"],
      ["1. Jangan mengubah nama kolom pada sheet ABSENSI SISWA."],
      [`2. Template ini dibuat untuk Kelas ${kelas}${rombel}, ${getMonthName(bulan)} ${tahun}.`],
      ["3. Jangan mengubah NIS, NISN, Nama Siswa, Kelas, Rombel, Bulan, dan Tahun."],
      ["4. Isi Hadir, Sakit, Izin, dan Alpa dengan angka 0 sampai 31."],
      ["5. Jumlah Hadir + Sakit + Izin + Alpa tidak boleh melebihi 31 hari."],
      ["6. Catatan boleh dikosongkan."],
      ["7. Simpan sebagai .xlsx atau .csv, kemudian upload kembali melalui menu Rekap Absensi."],
    ]);
    instructions["!cols"] = [{ wch: 100 }];

    const references = XLSX.utils.aoa_to_sheet([
      ["Keterangan", "Nilai"],
      ["Kelas", kelas],
      ["Rombel", rombel],
      ["Bulan", bulan],
      ["Nama Bulan", getMonthName(bulan)],
      ["Tahun", tahun],
      ["Batas nilai absensi", "0-31"],
    ]);

    XLSX.utils.book_append_sheet(workbook, dataSheet, "ABSENSI SISWA");
    XLSX.utils.book_append_sheet(workbook, instructions, "PETUNJUK");
    XLSX.utils.book_append_sheet(workbook, references, "REFERENSI");

    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    downloadBlob(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Template_Absensi_Kelas_${kelas}${rombel}_${getMonthName(bulan)}_${tahun}.xlsx`
    );
    setMessage(`Template Kelas ${kelas}${rombel} berhasil diunduh.`);
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows(rows), { header: [...ATTENDANCE_HEADERS] });
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 9 },
      { wch: 9 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "REKAP ABSENSI");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    downloadBlob(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Rekap_Absensi_Kelas_${kelas}${rombel}_${getMonthName(bulan)}_${tahun}.xlsx`
    );
    setMessage("Export Excel absensi berhasil diunduh.");
  }

  function exportCsv() {
    const csv = Papa.unparse(exportRows(rows));
    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      `Rekap_Absensi_Kelas_${kelas}${rombel}_${getMonthName(bulan)}_${tahun}.csv`
    );
    setMessage("Export CSV absensi berhasil diunduh.");
  }

  function validateAndPreview(sourceRows: Record<string, unknown>[], headers: string[]) {
    const missingHeaders = ATTENDANCE_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
      setPreview([]);
      setMessage(`Header tidak valid. Kolom yang belum ada: ${missingHeaders.join(", ")}. Gunakan template absensi.`);
      return;
    }

    const seenStudents = new Set<number>();
    const normalized = sourceRows
      .filter((source) => Object.values(source).some((value) => toText(value) !== ""))
      .map((source, index): ImportPreview => {
        const nis = toText(source["NIS"]);
        const nisn = toText(source["NISN"]);
        const sourceName = toText(source["Nama Siswa"]);
        const sourceClass = toText(source["Kelas"]);
        const sourceRombel = toText(source["Rombel"]).toUpperCase();
        const sourceMonth = toNumber(source["Bulan"]);
        const sourceYear = toNumber(source["Tahun"]);
        const hadir = toNumber(source["Hadir"]);
        const sakit = toNumber(source["Sakit"]);
        const izin = toNumber(source["Izin"]);
        const alpa = toNumber(source["Alpa"]);
        const catatan = toText(source["Catatan"]);
        const matched = rows.find((item) => (nisn && item.nisn === nisn) || (nis && item.nis === nis));
        const errors: string[] = [];

        if (!nis && !nisn) errors.push("NIS/NISN kosong");
        if (!sourceName) errors.push("Nama siswa kosong");
        if (!matched) errors.push("Siswa tidak ditemukan di kelas-rombel terpilih");
        if (sourceClass !== kelas) errors.push(`Kelas harus ${kelas}`);
        if (sourceRombel !== rombel) errors.push(`Rombel harus ${rombel}`);
        if (sourceMonth !== bulan) errors.push(`Bulan harus ${bulan}`);
        if (sourceYear !== tahun) errors.push(`Tahun harus ${tahun}`);

        const values = [hadir, sakit, izin, alpa];
        if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 31)) {
          errors.push("Nilai H/S/I/A harus angka 0-31");
        } else if (hadir + sakit + izin + alpa > 31) {
          errors.push("Jumlah hari melebihi 31");
        }

        if (matched && seenStudents.has(matched.studentId)) errors.push("Siswa duplikat di file");
        if (matched) seenStudents.add(matched.studentId);

        return {
          rowNumber: index + 2,
          studentId: matched?.studentId ?? null,
          nis,
          nisn,
          namaSiswa: matched?.namaSiswa ?? sourceName,
          kelas: sourceClass,
          rombel: sourceRombel,
          bulan: sourceMonth,
          tahun: sourceYear,
          hadir,
          sakit,
          izin,
          alpa,
          catatan,
          errors,
        };
      });

    setPreview(normalized);
    setMessage(`Preview siap: ${normalized.length} baris, ${normalized.filter((item) => item.errors.length === 0).length} valid, ${normalized.filter((item) => item.errors.length > 0).length} gagal.`);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setMessage("Membaca file...");
    setPreview([]);

    if (file.name.toLowerCase().endsWith(".csv")) {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result: ParseResult<Record<string, unknown>>) => {
          validateAndPreview(result.data, result.meta.fields ?? []);
        },
        error: () => setMessage("File CSV gagal dibaca."),
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
        const headers = (matrix[0] ?? []).map((value) => toText(value));
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
        validateAndPreview(data, headers);
      } catch {
        setMessage("File Excel tidak valid atau tidak dapat dibaca.");
      }
    };
    reader.onerror = () => setMessage("File gagal dibaca.");
    reader.readAsArrayBuffer(file);
  }

  function cancelPreview() {
    setPreview([]);
    setFileName("");
    setMessage("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function saveImport() {
    if (!validRows.length) {
      setMessage("Tidak ada baris valid untuk disimpan.");
      return;
    }

    const payload: AttendanceInput[] = validRows.map((item) => ({
      studentId: item.studentId as number,
      kelas,
      rombel,
      bulan,
      tahun,
      hadir: item.hadir,
      sakit: item.sakit,
      izin: item.izin,
      alpa: item.alpa,
      catatan: item.catatan,
    }));

    startTransition(async () => {
      const result = await saveAttendanceAction(payload);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      const importedRows = rows.map((row) => {
        const imported = validRows.find((item) => item.studentId === row.studentId);
        return imported
          ? { ...row, hadir: imported.hadir, sakit: imported.sakit, izin: imported.izin, alpa: imported.alpa, catatan: imported.catatan }
          : row;
      });
      const resultMessage = `${result.message}. Berhasil: ${validRows.length}, gagal: ${invalidRows}.`;
      onImported(importedRows, resultMessage);
      setMessage(resultMessage);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Import & Export Absensi</h3>
          <p className="mt-1 text-sm text-slate-500">
            Template dan file export mengikuti Kelas {kelas}{rombel}, periode {getMonthName(bulan)} {tahun}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Button onClick={downloadTemplate} disabled={!rows.length}>
            <FileSpreadsheet className="mr-2" size={17} /> Download Template
          </Button>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">
            <Upload className="mr-2" size={17} /> Import Excel / CSV
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
            />
          </label>
          <Button variant="secondary" onClick={exportExcel} disabled={!rows.length}>
            <FileDown className="mr-2" size={17} /> Export Excel
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2" size={17} /> Export CSV
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Alur: pilih kelas dan rombel → download template → isi absensi → import file → periksa preview → simpan hasil import.
        </p>

        {message ? <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div> : null}

        {preview.length ? (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-slate-950">Preview Import: {fileName}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>Total {preview.length}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">Valid {validRows.length}</Badge>
                  <Badge className="bg-rose-100 text-rose-700">Gagal {invalidRows}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={cancelPreview}><X className="mr-2" size={16} /> Batalkan</Button>
                <Button disabled={pending || !validRows.length} onClick={saveImport}>
                  {pending ? "Menyimpan..." : "Simpan Hasil Import"}
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    {['Baris', 'NISN', 'Nama Siswa', 'Kelas', 'H', 'S', 'I', 'A', 'Status'].map((head) => (
                      <th key={head} className="whitespace-nowrap px-3 py-3">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item) => (
                    <tr key={`${item.rowNumber}-${item.nisn}`} className="border-t border-slate-100">
                      <td className="px-3 py-3">{item.rowNumber}</td>
                      <td className="px-3 py-3">{item.nisn}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{item.namaSiswa}</td>
                      <td className="px-3 py-3">{item.kelas}{item.rombel}</td>
                      <td className="px-3 py-3">{item.hadir}</td>
                      <td className="px-3 py-3">{item.sakit}</td>
                      <td className="px-3 py-3">{item.izin}</td>
                      <td className="px-3 py-3">{item.alpa}</td>
                      <td className="min-w-64 px-3 py-3">
                        {item.errors.length ? <span className="text-rose-600">{item.errors.join(", ")}</span> : <span className="font-semibold text-emerald-600">Valid</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
