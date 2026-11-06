"use client";

import { ArrowUpRight } from "lucide-react";
import type { AttendanceGroupSummary, AttendanceGrouping, SchoolAttendanceSummary } from "@/lib/attendance-summary";
import { Button } from "@/components/ui";

export function SchoolAttendanceSummaryTable({
  summary,
  grouping = "rombel",
  onOpenClass,
}: {
  summary: SchoolAttendanceSummary;
  grouping?: AttendanceGrouping;
  onOpenClass?: (group: AttendanceGroupSummary) => void;
}) {
  const rows = grouping === "rombel" ? summary.perRombel : summary.perKelas;
  const withActions = Boolean(onOpenClass) && grouping === "rombel";
  const totals = summary.totals;
  const cell = "border border-slate-300 px-3 py-2.5 text-center print:px-2 print:py-2";

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="min-w-full border-collapse text-xs md:text-sm print:text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className={`${cell} whitespace-nowrap text-left`}>{grouping === "rombel" ? "Kelas / Rombel" : "Tingkat Kelas"}</th>
            <th scope="col" className={cell}>Jumlah Siswa</th>
            <th scope="col" className={cell}>Tersimpan</th>
            <th scope="col" className={cell}>Belum Diisi</th>
            <th scope="col" className={cell}>Hadir</th>
            <th scope="col" className={cell}>Sakit</th>
            <th scope="col" className={cell}>Izin</th>
            <th scope="col" className={cell}>Alpa</th>
            <th scope="col" className={cell}>Jumlah Hari</th>
            <th scope="col" className={cell}>% Hadir</th>
            {withActions ? <th scope="col" className={`${cell} print:hidden`}>Pengisian</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.kelas}:${row.rombel}`} className="text-slate-700 hover:bg-slate-50/70">
              <th scope="row" className={`${cell} whitespace-nowrap text-left font-semibold text-slate-900`}>{row.label}</th>
              <td className={cell}>{row.jumlahSiswa}</td>
              <td className={`${cell} text-emerald-700`}>{row.sudahDiisi}</td>
              <td className={`${cell} ${row.belumDiisi ? "font-semibold text-amber-700" : "text-slate-400"}`}>{row.belumDiisi}</td>
              <td className={`${cell} font-medium text-emerald-700`}>{row.hadir}</td>
              <td className={cell}>{row.sakit}</td>
              <td className={cell}>{row.izin}</td>
              <td className={`${cell} ${row.alpa ? "text-rose-700" : ""}`}>{row.alpa}</td>
              <td className={`${cell} font-medium`}>{row.totalHari}</td>
              <td className={cell}>{row.persentaseHadir === null ? "—" : `${row.persentaseHadir.toLocaleString("id-ID")}%`}</td>
              {withActions ? (
                <td className={`${cell} print:hidden`}>
                  <Button variant="ghost" className="gap-1.5 whitespace-nowrap px-2 py-1.5 text-xs text-sky-700" onClick={() => onOpenClass?.(row)}>
                    Buka Kelas <ArrowUpRight size={14} />
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-sky-50 font-bold text-slate-950">
          <tr>
            <th scope="row" className={`${cell} whitespace-nowrap text-left`}>TOTAL SEKOLAH</th>
            <td className={cell}>{totals.jumlahSiswa}</td>
            <td className={cell}>{totals.sudahDiisi}</td>
            <td className={cell}>{totals.belumDiisi}</td>
            <td className={cell}>{totals.hadir}</td>
            <td className={cell}>{totals.sakit}</td>
            <td className={cell}>{totals.izin}</td>
            <td className={cell}>{totals.alpa}</td>
            <td className={cell}>{totals.totalHari}</td>
            <td className={cell}>{totals.persentaseHadir === null ? "—" : `${totals.persentaseHadir.toLocaleString("id-ID")}%`}</td>
            {withActions ? <td className={`${cell} print:hidden`}></td> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function SchoolAttendanceReportBody({ summary, grouping = "rombel" }: { summary: SchoolAttendanceSummary; grouping?: AttendanceGrouping }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm print:text-xs">
        <p>Jumlah siswa: <strong>{summary.totals.jumlahSiswa}</strong> • Rombel berisi siswa: <strong>{summary.jumlahRombel}</strong></p>
        <p>Absensi tersimpan: <strong>{summary.totals.sudahDiisi}</strong> • Belum diisi: <strong>{summary.totals.belumDiisi}</strong></p>
      </div>
      <SchoolAttendanceSummaryTable summary={summary} grouping={grouping} />
      <div className="space-y-1 text-xs leading-5 text-slate-600">
        <p><strong>Keterangan:</strong> Hadir, Sakit, Izin, dan Alpa adalah akumulasi hari seluruh siswa, bukan jumlah siswa.</p>
        <p>Persentase hadir = Hadir ÷ (Hadir + Sakit + Izin + Alpa) × 100%. Tanda — berarti belum ada jumlah hari tercatat.</p>
        <p>Rekap hanya menggunakan absensi yang sudah disimpan. Siswa yang belum diisi tidak otomatis dihitung sebagai alpa.</p>
        {summary.totals.belumDiisi > 0 ? <p className="font-semibold text-amber-800">Perhatian: absensi {summary.totals.belumDiisi} siswa belum tersimpan pada periode ini. Rekap sekolah belum lengkap.</p> : null}
      </div>
    </div>
  );
}
