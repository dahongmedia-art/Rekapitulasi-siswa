"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import Papa, { type ParseResult } from "papaparse";
import { importStudentsAction } from "@/app/actions";
import { Button, Card, CardContent, SectionTitle, Select } from "@/components/ui";
import { CLASS_OPTIONS, GENDER_OPTIONS, ROMBEL_OPTIONS, STATUS_OPTIONS, STUDENT_TEMPLATE_HEADERS } from "@/lib/constants";
import { downloadBlob, parseDateInput } from "@/lib/utils";
import type { ImportPreviewRow } from "@/lib/types";

type Mode = "add" | "update" | "replace";

function normalizeRow(row: Record<string, unknown>, index: number): ImportPreviewRow {
  const data = {
    nis: String(row["NIS"] ?? "").trim(),
    nisn: String(row["NISN"] ?? "").trim(),
    namaSiswa: String(row["Nama Siswa"] ?? "").trim(),
    jenisKelamin: String(row["Jenis Kelamin"] ?? "").trim(),
    tempatLahir: String(row["Tempat Lahir"] ?? "").trim(),
    tanggalLahir: String(row["Tanggal Lahir"] ?? "").trim(),
    kelas: String(row["Kelas"] ?? "").trim(),
    rombel: String(row["Rombel"] ?? "").trim().toUpperCase(),
    alamat: String(row["Alamat"] ?? "").trim(),
    namaOrangTua: String(row["Nama Orang Tua/Wali"] ?? "").trim(),
    statusSiswa: String(row["Status Siswa"] ?? "").trim(),
  };

  const errors: string[] = [];
  if (!data.nis) errors.push("NIS kosong");
  if (!data.nisn) errors.push("NISN kosong");
  if (!data.namaSiswa) errors.push("Nama siswa kosong");
  if (!GENDER_OPTIONS.includes(data.jenisKelamin as (typeof GENDER_OPTIONS)[number])) errors.push("Jenis kelamin tidak valid");
  if (!data.tempatLahir) errors.push("Tempat lahir kosong");
  if (!parseDateInput(data.tanggalLahir)) errors.push("Tanggal lahir tidak valid");
  if (!CLASS_OPTIONS.includes(data.kelas as (typeof CLASS_OPTIONS)[number])) errors.push("Kelas tidak valid");
  if (!ROMBEL_OPTIONS.includes(data.rombel as (typeof ROMBEL_OPTIONS)[number])) errors.push("Rombel harus A atau B");
  if (!data.alamat) errors.push("Alamat kosong");
  if (!data.namaOrangTua) errors.push("Nama orang tua/wali kosong");
  if (!STATUS_OPTIONS.includes(data.statusSiswa as (typeof STATUS_OPTIONS)[number])) errors.push("Status siswa tidak valid");

  return {
    rowNumber: index + 2,
    data,
    errors,
    duplicateInFile: false,
    duplicateExisting: false,
  };
}

export function ImportSection({ existingNis, existingNisn }: { existingNis: string[]; existingNisn: string[] }) {
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("add");
  const [pending, startTransition] = useTransition();

  const hasInvalidHeader = useMemo(() => false, []);

  function handleWorkbook(rows: Record<string, unknown>[]) {
    const normalized = rows.map(normalizeRow);
    const seen = new Set<string>();

    normalized.forEach((row) => {
      const key = `${row.data.nis}::${row.data.nisn}`;
      if (seen.has(key)) row.duplicateInFile = true;
      seen.add(key);
      if (existingNis.includes(row.data.nis) || existingNisn.includes(row.data.nisn)) row.duplicateExisting = true;
      if (row.duplicateInFile) row.errors.push("Duplikat di file import");
      if (row.duplicateExisting && mode === "add") row.errors.push("Duplikat dengan database");
    });

    setPreview(normalized);
    setMessage(`Preview siap: ${normalized.length} baris terdeteksi.`);
  }

  function handleFile(file: File) {
    setMessage("");
    const ext = file.name.toLowerCase();

    if (ext.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, unknown>>) => {
          handleWorkbook(results.data as Record<string, unknown>[]);
        },
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      handleWorkbook(json);
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const sheetData = [Array.from(STUDENT_TEMPLATE_HEADERS)];
    const petunjuk = [
      ["PETUNJUK PENGISIAN"],
      ["1. Jangan ubah nama header kolom pada sheet DATA SISWA."],
      ["2. Jenis Kelamin hanya boleh: Laki-laki / Perempuan."],
      ["3. Kelas hanya boleh: 1, 2, 3, 4, 5, 6."],
      ["4. Rombel hanya boleh: A atau B."],
      ["5. Status siswa: Aktif, Mutasi Masuk, Mutasi Keluar, Lulus."],
      ["6. Gunakan format tanggal lahir YYYY-MM-DD atau DD/MM/YYYY."],
      ["7. Kolom No boleh dikosongkan karena dibuat otomatis oleh aplikasi."],
    ];
    const referensi = [
      ["Jenis Kelamin"],
      ...GENDER_OPTIONS.map((item) => [item]),
      [],
      ["Kelas"],
      ...CLASS_OPTIONS.map((item) => [item]),
      [],
      ["Rombel"],
      ...ROMBEL_OPTIONS.map((item) => [item]),
      [],
      ["Status Siswa"],
      ...STATUS_OPTIONS.map((item) => [item]),
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "DATA SISWA");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(petunjuk), "PETUNJUK");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(referensi), "REFERENSI");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Template_Data_Siswa.xlsx");
  }

  async function handleSave() {
    const validRows = preview.filter((row) => row.errors.length === 0).map((row) => row.data);
    if (!validRows.length) {
      setMessage("Tidak ada data valid untuk disimpan.");
      return;
    }

    if (mode === "replace" && !window.confirm("Ganti seluruh data siswa dengan data import ini?")) return;

    startTransition(async () => {
      const result = await importStudentsAction(mode, validRows);
      setMessage(`${result.message}. Berhasil: ${validRows.length}. Gagal: ${preview.length - validRows.length}.`);
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Import Data" subtitle="Download template terlebih dahulu, isi data siswa sesuai format, kemudian upload kembali melalui menu Import Data." />
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadTemplate}>📥 Download Template Excel</Button>
        <label className="inline-flex cursor-pointer items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">
          Pilih File Excel / CSV
          <input className="hidden" type="file" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        <Select className="max-w-xs" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="add">Tambahkan data</option>
          <option value="update">Perbarui data</option>
          <option value="replace">Ganti seluruh data</option>
        </Select>
        <Button variant="secondary" onClick={() => setPreview([])}>
          Batalkan Preview
        </Button>
        <Button disabled={pending || !preview.length || hasInvalidHeader} onClick={handleSave}>
          {pending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        Download template terlebih dahulu, isi data siswa sesuai format, kemudian upload kembali melalui menu Import Data.
      </p>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <Card>
        <CardContent>
          <h3 className="mb-4 text-lg font-semibold text-slate-950">Preview Data Import</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">Baris</th>
                  <th className="px-3 py-3">NIS</th>
                  <th className="px-3 py-3">NISN</th>
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Kelas</th>
                  <th className="px-3 py-3">Rombel</th>
                  <th className="px-3 py-3">Gender</th>
                  <th className="px-3 py-3">Status Validasi</th>
                </tr>
              </thead>
              <tbody>
                {preview.length ? (
                  preview.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-slate-100">
                      <td className="px-3 py-3">{row.rowNumber}</td>
                      <td className="px-3 py-3">{row.data.nis}</td>
                      <td className="px-3 py-3">{row.data.nisn}</td>
                      <td className="px-3 py-3">{row.data.namaSiswa}</td>
                      <td className="px-3 py-3">{row.data.kelas}</td>
                      <td className="px-3 py-3">{row.data.rombel}</td>
                      <td className="px-3 py-3">{row.data.jenisKelamin}</td>
                      <td className="px-3 py-3">
                        {row.errors.length ? <span className="text-rose-600">{row.errors.join(", ")}</span> : <span className="text-emerald-600">Valid</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                      Belum ada file yang dipreview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
