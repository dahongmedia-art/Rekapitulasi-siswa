"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardContent, Input, SectionTitle, Select } from "@/components/ui";
import { SchoolLetterhead } from "@/components/school-letterhead";
import { SchoolAttendanceReportBody } from "@/components/school-attendance-table";
import { buildSchoolAttendanceSummary, isValidAttendancePeriod, type AttendanceGrouping } from "@/lib/attendance-summary";
import { waitForReportImages } from "@/lib/branding";
import { CLASS_OPTIONS, GENDER_OPTIONS, ROMBEL_OPTIONS } from "@/lib/constants";
import { buildAgeRecapAt, formatDateIndonesia, getMonthsForAgePeriod, getMonthName } from "@/lib/utils";
import type {
  AgeRecapRow,
  AttendanceRecapRecord,
  DashboardSummary,
  MonthlyAgeRecap,
  SchoolSettingsRecord,
  SemesterAgeRecap,
  StudentRecord,
  YearlyAgeRecap,
} from "@/lib/types";

function AgeTable({ rows }: { rows: AgeRecapRow[] }) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-slate-400 px-3 py-2">Usia</th>
          <th className="border border-slate-400 px-3 py-2">Laki-laki</th>
          <th className="border border-slate-400 px-3 py-2">Perempuan</th>
          <th className="border border-slate-400 px-3 py-2">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((item) => (
            <tr key={item.usia}>
              <td className="border border-slate-400 px-3 py-2">{item.usia} tahun</td>
              <td className="border border-slate-400 px-3 py-2 text-center">{item.lakiLaki}</td>
              <td className="border border-slate-400 px-3 py-2 text-center">{item.perempuan}</td>
              <td className="border border-slate-400 px-3 py-2 text-center font-semibold">{item.total}</td>
            </tr>
          ))
        ) : (
          <tr><td colSpan={4} className="border border-slate-400 px-3 py-6 text-center">Tidak ada data.</td></tr>
        )}
      </tbody>
    </table>
  );
}

export function PrintSection({
  students,
  settings,
  summary,
  monthlyRecaps,
  attendanceRecaps,
}: {
  students: StudentRecord[];
  settings: SchoolSettingsRecord;
  summary: DashboardSummary;
  monthlyRecaps: MonthlyAgeRecap[];
  yearlyAgeRecap: YearlyAgeRecap;
  semesterOneRecap: SemesterAgeRecap;
  semesterTwoRecap: SemesterAgeRecap;
  attendanceRecaps: AttendanceRecapRecord[];
}) {
  const now = new Date();
  const [type, setType] = useState("daftar");
  const [kelas, setKelas] = useState("1");
  const [rombel, setRombel] = useState("A");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [periodeCetak, setPeriodeCetak] = useState("bulan");
  const [semester, setSemester] = useState("1");
  const [ageScope, setAgeScope] = useState("all");
  const [ageClass, setAgeClass] = useState("1");
  const [ageRombel, setAgeRombel] = useState("A");
  const [schoolGrouping, setSchoolGrouping] = useState<AttendanceGrouping>("rombel");
  const schoolAttendanceSummary = useMemo(() => {
    const month = Number(bulan);
    const year = Number(tahun);
    return /^\d{4}$/.test(tahun) && isValidAttendancePeriod(month, year)
      ? buildSchoolAttendanceSummary(students, attendanceRecaps, month, year)
      : null;
  }, [students, attendanceRecaps, bulan, tahun]);

  const years = useMemo(() => {
    const result = new Set(monthlyRecaps.map((item) => item.tahun));
    result.add(now.getFullYear());
    return Array.from(result).sort((a, b) => a - b);
  }, [monthlyRecaps, now]);

  const classLabel = `${kelas}${rombel}`;
  const isClassReport = ["daftar", "kelas", "gender", "attendance"].includes(type);

  const filteredStudents = useMemo(
    () =>
      students
        .filter((item) => item.kelas === kelas && item.rombel.trim().toUpperCase() === rombel)
        .filter((item) => (!jenisKelamin ? true : item.jenisKelamin === jenisKelamin))
        .sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa, "id")),
    [students, kelas, rombel, jenisKelamin]
  );

  const selectedClassStudents = useMemo(
    () => students.filter((item) => item.kelas === kelas && item.rombel.trim().toUpperCase() === rombel),
    [students, kelas, rombel]
  );

  const selectedClassSummary = useMemo(() => {
    const lakiLaki = selectedClassStudents.filter((item) => item.jenisKelamin === "Laki-laki").length;
    const perempuan = selectedClassStudents.filter((item) => item.jenisKelamin === "Perempuan").length;
    return { lakiLaki, perempuan, total: selectedClassStudents.length };
  }, [selectedClassStudents]);

  const allClassRecaps = useMemo(
    () =>
      CLASS_OPTIONS.flatMap((classItem) =>
        ROMBEL_OPTIONS.map((rombelItem) => {
          const members = students.filter(
            (student) => student.kelas === classItem && student.rombel.trim().toUpperCase() === rombelItem
          );
          return {
            kelas: `${classItem}${rombelItem}`,
            lakiLaki: members.filter((student) => student.jenisKelamin === "Laki-laki").length,
            perempuan: members.filter((student) => student.jenisKelamin === "Perempuan").length,
            total: members.length,
          };
        })
      ),
    [students]
  );

  const attendanceRows = useMemo(() => {
    const existing = attendanceRecaps.filter(
      (item) =>
        item.kelas === kelas &&
        item.rombel.trim().toUpperCase() === rombel &&
        item.bulan === Number(bulan) &&
        item.tahun === Number(tahun)
    );
    const existingMap = new Map(existing.map((item) => [item.studentId, item]));
    const merged = new Map<number, AttendanceRecapRecord>();

    selectedClassStudents.forEach((student) => {
      const saved = existingMap.get(student.id);
      merged.set(student.id, saved ?? {
        id: -student.id,
        studentId: student.id,
        nis: student.nis,
        nisn: student.nisn,
        namaSiswa: student.namaSiswa,
        kelas,
        rombel,
        bulan: Number(bulan),
        tahun: Number(tahun),
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        catatan: "",
      });
    });
    existing.forEach((item) => merged.set(item.studentId, item));

    return Array.from(merged.values()).sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa, "id"));
  }, [attendanceRecaps, selectedClassStudents, kelas, rombel, bulan, tahun]);

  const attendanceTotals = useMemo(
    () =>
      attendanceRows.reduce(
        (total, item) => ({
          hadir: total.hadir + item.hadir,
          sakit: total.sakit + item.sakit,
          izin: total.izin + item.izin,
          alpa: total.alpa + item.alpa,
        }),
        { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
      ),
    [attendanceRows]
  );

  const ageStudents = useMemo(
    () =>
      ageScope === "all"
        ? students
        : students.filter((item) => item.kelas === ageClass && item.rombel.trim().toUpperCase() === ageRombel),
    [students, ageScope, ageClass, ageRombel]
  );

  const ageScopeLabel = ageScope === "all" ? "Seluruh Sekolah" : `Kelas ${ageClass}${ageRombel}`;

  const ageMonths = useMemo(() => {
    const year = Number(tahun);
    const monthList = getMonthsForAgePeriod(periodeCetak, semester, year, Number(bulan));
    return monthList.map((month) => ({
      bulan: month,
      tahun: year,
      label: `${getMonthName(month)} ${year}`,
      perUsia: buildAgeRecapAt(ageStudents, new Date(year, month, 0)),
    }));
  }, [ageStudents, tahun, bulan, semester, periodeCetak]);

  const ageTotals = useMemo(
    () =>
      ageMonths.reduce(
        (total, item) => {
          item.perUsia.forEach((row) => {
            total.lakiLaki += row.lakiLaki;
            total.perempuan += row.perempuan;
            total.total += row.total;
          });
          return total;
        },
        { lakiLaki: 0, perempuan: 0, total: 0 }
      ),
    [ageMonths]
  );

  const reportTitle = useMemo(() => {
    if (type === "daftar") return `Daftar Siswa Kelas ${classLabel}`;
    if (type === "kelas") return `Rekap Siswa Kelas ${classLabel}`;
    if (type === "gender") return `Daftar Siswa ${jenisKelamin || "Semua Jenis Kelamin"} Kelas ${classLabel}`;
    if (type === "attendance") return `Rekap Absensi Kelas ${classLabel} - ${getMonthName(Number(bulan))} ${tahun}`;
    if (type === "attendance_school") return `Rekap Absensi Seluruh Sekolah - ${getMonthName(Number(bulan))} ${tahun}`;
    if (type === "rekap") return "Rekap Seluruh Kelas dan Rombel";
    if (type === "usia") {
      const suffix = ageScope === "all" ? "Seluruh Sekolah" : `Kelas ${ageClass}${ageRombel}`;
      if (periodeCetak === "tahun") return `Rekap Usia Siswa 1 Tahun ${tahun} - ${suffix}`;
      if (periodeCetak === "semester") return `Rekap Usia Siswa Semester ${semester} Tahun ${tahun} - ${suffix}`;
      return `Rekap Usia Siswa ${ageMonths[0]?.label ?? ""} - ${suffix}`;
    }
    return "Dashboard Statistik";
  }, [type, classLabel, jenisKelamin, bulan, tahun, periodeCetak, semester, ageScope, ageClass, ageRombel, ageMonths]);

  async function handlePrint() {
    const report = document.querySelector<HTMLElement>(".print-report");
    if (report) await waitForReportImages(report);
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-0">
      {type === "attendance" || type === "attendance_school" ? <style>{"@media print { @page { size: A4 landscape; margin: 12mm; } }"}</style> : null}

      <div className="print:hidden">
        <SectionTitle
          title="Cetak Laporan"
          subtitle="Pilih laporan per kelas-rombel atau seluruh sekolah. Untuk rekap absensi sekolah, pilih bulan dan tahun tanpa memilih satu kelas."
        />
        <Card className="mt-6">
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Jenis Laporan</label>
                <Select value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="daftar">Daftar Siswa per Kelas</option>
                  <option value="kelas">Rekap Siswa per Kelas</option>
                  <option value="attendance">Rekap Absensi per Kelas</option>
                  <option value="attendance_school">Rekap Absensi Seluruh Sekolah</option>
                  <option value="rekap">Rekap Seluruh Kelas & Rombel</option>
                  <option value="gender">Daftar berdasarkan Jenis Kelamin</option>
                  <option value="usia">Rekap berdasarkan Usia</option>
                  <option value="dashboard">Dashboard Statistik</option>
                </Select>
              </div>

              {isClassReport ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Tingkat Kelas</label>
                    <Select value={kelas} onChange={(event) => setKelas(event.target.value)}>
                      {CLASS_OPTIONS.map((item) => <option key={item} value={item}>Kelas {item}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Rombel</label>
                    <Select value={rombel} onChange={(event) => setRombel(event.target.value)}>
                      {ROMBEL_OPTIONS.map((item) => <option key={item} value={item}>Rombel {item}</option>)}
                    </Select>
                  </div>
                </>
              ) : null}

              {type === "gender" || type === "daftar" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Jenis Kelamin</label>
                  <Select value={jenisKelamin} onChange={(event) => setJenisKelamin(event.target.value)}>
                    <option value="">Semua Jenis Kelamin</option>
                    {GENDER_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </Select>
                </div>
              ) : null}
            </div>

            {type === "attendance" || type === "attendance_school" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label htmlFor="print-attendance-month" className="mb-1 block text-xs font-semibold text-slate-500">Bulan Absensi</label>
                  <Select id="print-attendance-month" value={bulan} onChange={(event) => setBulan(event.target.value)}>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                      <option key={item} value={String(item)}>{getMonthName(item)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="print-attendance-year" className="mb-1 block text-xs font-semibold text-slate-500">Tahun Absensi</label>
                  <Input id="print-attendance-year" type="number" min={2000} max={2100} value={tahun} onChange={(event) => setTahun(event.target.value)} />
                </div>
                {type === "attendance_school" ? (
                  <div>
                    <label htmlFor="print-school-grouping" className="mb-1 block text-xs font-semibold text-slate-500">Rincian Seluruh Sekolah</label>
                    <Select id="print-school-grouping" value={schoolGrouping} onChange={(event) => setSchoolGrouping(event.target.value as AttendanceGrouping)}>
                      <option value="rombel">Per Kelas &amp; Rombel (1A–6B)</option>
                      <option value="kelas">Gabungan per Kelas (A + B)</option>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-end rounded-2xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">Keluaran: Kelas {classLabel}</div>
                )}
                <div className="flex items-end rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  {type === "attendance_school" ? `Semua Kelas · ${schoolAttendanceSummary?.totals.jumlahSiswa ?? 0} siswa` : `${attendanceRows.length} siswa`}
                </div>
              </div>
            ) : null}

            {type === "usia" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Ruang Lingkup Usia</label>
                  <Select value={ageScope} onChange={(event) => setAgeScope(event.target.value)}>
                    <option value="all">Semua Kelas (1 Sekolah)</option>
                    <option value="class">Per Kelas &amp; Rombel</option>
                  </Select>
                </div>
                {ageScope === "class" ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Tingkat Kelas</label>
                      <Select value={ageClass} onChange={(event) => setAgeClass(event.target.value)}>
                        {CLASS_OPTIONS.map((item) => (
                          <option key={item} value={item}>Kelas {item}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Rombel</label>
                      <Select value={ageRombel} onChange={(event) => setAgeRombel(event.target.value)}>
                        {ROMBEL_OPTIONS.map((item) => (
                          <option key={item} value={item}>Rombel {item}</option>
                        ))}
                      </Select>
                    </div>
                  </>
                ) : null}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Periode Cetak</label>
                  <Select value={periodeCetak} onChange={(event) => setPeriodeCetak(event.target.value)}>
                    <option value="bulan">Cetak 1 Bulan</option>
                    <option value="semester">Cetak 1 Semester</option>
                    <option value="tahun">Cetak 1 Tahun</option>
                  </Select>
                </div>
                <Select value={bulan} onChange={(event) => setBulan(event.target.value)}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                    <option key={item} value={String(item)}>{getMonthName(item)}</option>
                  ))}
                </Select>
                <Select value={tahun} onChange={(event) => setTahun(event.target.value)}>
                  {years.map((item) => <option key={item} value={String(item)}>{item}</option>)}
                </Select>
                <Select value={semester} onChange={(event) => setSemester(event.target.value)}>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handlePrint} disabled={type === "attendance_school" && !schoolAttendanceSummary}>🖨️ CETAK LAPORAN</Button>
              {isClassReport ? (
                <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
                  Data yang dicetak: Kelas {classLabel}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <article className="print-report mx-auto max-w-5xl rounded-3xl bg-white p-8 text-slate-900 shadow print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <SchoolLetterhead settings={settings} />

        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold uppercase">{reportTitle}</h2>
          <p className="text-sm">Tahun Pelajaran: {settings.tahunPelajaran || "-"}</p>
        </div>

        <section className="mt-6 overflow-x-auto print:overflow-visible">
          {type === "dashboard" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-300 p-4"><p>Total Siswa</p><h3 className="text-3xl font-bold">{summary.totalSiswa}</h3></div>
              <div className="rounded-2xl border border-slate-300 p-4"><p>Jenis Kelamin</p><h3 className="text-xl font-bold">L: {summary.totalLakiLaki} • P: {summary.totalPerempuan}</h3></div>
            </div>
          ) : type === "attendance_school" ? (
            schoolAttendanceSummary
              ? <SchoolAttendanceReportBody summary={schoolAttendanceSummary} grouping={schoolGrouping} />
              : <p role="alert" className="text-sm text-rose-700">Pilih bulan dan tahun 2000–2100 yang valid sebelum mencetak.</p>
          ) : type === "attendance" ? (
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  {['No', 'NIS', 'NISN', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Jumlah', 'Catatan'].map((head) => (
                    <th key={head} className="border border-slate-400 px-2 py-2">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRows.length ? attendanceRows.map((item, index) => (
                  <tr key={item.studentId}>
                    <td className="border border-slate-400 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-2">{item.nis}</td>
                    <td className="border border-slate-400 px-2 py-2">{item.nisn}</td>
                    <td className="border border-slate-400 px-2 py-2">{item.namaSiswa}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center">{item.hadir}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center">{item.sakit}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center">{item.izin}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center">{item.alpa}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center font-semibold">{item.hadir + item.sakit + item.izin + item.alpa}</td>
                    <td className="border border-slate-400 px-2 py-2">{item.catatan || "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="border border-slate-400 px-3 py-8 text-center">Belum ada siswa di Kelas {classLabel}.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={4} className="border border-slate-400 px-2 py-2">TOTAL KELAS {classLabel}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{attendanceTotals.hadir}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{attendanceTotals.sakit}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{attendanceTotals.izin}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{attendanceTotals.alpa}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{attendanceTotals.hadir + attendanceTotals.sakit + attendanceTotals.izin + attendanceTotals.alpa}</td>
                  <td className="border border-slate-400 px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          ) : type === "usia" ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
                <strong>Ruang lingkup:</strong> {ageScopeLabel} • <strong>Periode:</strong>{" "}
                {periodeCetak === "tahun"
                  ? `1 Tahun ${tahun}`
                  : periodeCetak === "semester"
                    ? `Semester ${semester} Tahun ${tahun}`
                    : ageMonths[0]?.label}{" "}
                • Laki-laki {ageTotals.lakiLaki} • Perempuan {ageTotals.perempuan} • Total {ageTotals.total}
              </div>
              {ageMonths.length === 1 ? (
                <AgeTable rows={ageMonths[0]?.perUsia ?? []} />
              ) : (
                ageMonths.map((month) => (
                  <div key={`${month.tahun}-${month.bulan}`} className="break-inside-avoid">
                    <h3 className="mb-2 font-bold">{month.label}</h3>
                    <AgeTable rows={month.perUsia} />
                  </div>
                ))
              )}
            </div>
          ) : type === "rekap" ? (
            <table className="min-w-full border-collapse text-sm">
              <thead><tr><th className="border border-slate-400 px-3 py-2">Kelas</th><th className="border border-slate-400 px-3 py-2">Laki-laki</th><th className="border border-slate-400 px-3 py-2">Perempuan</th><th className="border border-slate-400 px-3 py-2">Total</th></tr></thead>
              <tbody>
                {allClassRecaps.map((item) => (
                  <tr key={item.kelas}><td className="border border-slate-400 px-3 py-2 font-medium">Kelas {item.kelas}</td><td className="border border-slate-400 px-3 py-2 text-center">{item.lakiLaki}</td><td className="border border-slate-400 px-3 py-2 text-center">{item.perempuan}</td><td className="border border-slate-400 px-3 py-2 text-center font-semibold">{item.total}</td></tr>
                ))}
                <tr className="font-bold"><td className="border border-slate-400 px-3 py-2">TOTAL</td><td className="border border-slate-400 px-3 py-2 text-center">{summary.totalLakiLaki}</td><td className="border border-slate-400 px-3 py-2 text-center">{summary.totalPerempuan}</td><td className="border border-slate-400 px-3 py-2 text-center">{summary.totalSiswa}</td></tr>
              </tbody>
            </table>
          ) : type === "kelas" ? (
            <div className="space-y-6">
              <table className="min-w-full border-collapse text-sm">
                <thead><tr><th className="border border-slate-400 px-3 py-2">Kelas</th><th className="border border-slate-400 px-3 py-2">Laki-laki</th><th className="border border-slate-400 px-3 py-2">Perempuan</th><th className="border border-slate-400 px-3 py-2">Total</th></tr></thead>
                <tbody><tr><td className="border border-slate-400 px-3 py-2 font-bold">Kelas {classLabel}</td><td className="border border-slate-400 px-3 py-2 text-center">{selectedClassSummary.lakiLaki}</td><td className="border border-slate-400 px-3 py-2 text-center">{selectedClassSummary.perempuan}</td><td className="border border-slate-400 px-3 py-2 text-center font-bold">{selectedClassSummary.total}</td></tr></tbody>
              </table>
              <StudentListTable students={selectedClassStudents.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa, "id"))} />
            </div>
          ) : (
            <StudentListTable students={filteredStudents} />
          )}
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-sm break-inside-avoid">
          <div>
            <p>Mengetahui,<br />Kepala Sekolah</p>
            <p className="mt-16 font-semibold">{settings.namaKepalaSekolah || "Kepala Sekolah"}</p>
            <p>NIP. {settings.nipKepalaSekolah || "-"}</p>
          </div>
          <div>
            <p>{settings.kabupaten || "-"}<br />{isClassReport ? `Wali Kelas ${classLabel}` : "Operator Sekolah"}</p>
            <p className="mt-16 font-semibold">{isClassReport ? "(................................)" : settings.namaOperator || "Operator"}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function StudentListTable({ students }: { students: StudentRecord[] }) {
  return (
    <table className="min-w-full border-collapse text-xs">
      <thead>
        <tr>
          {['No', 'NIS', 'NISN', 'Nama Siswa', 'Jenis Kelamin', 'Tempat, Tanggal Lahir', 'Kelas'].map((head) => (
            <th key={head} className="border border-slate-400 px-2 py-2">{head}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.length ? students.map((item, index) => (
          <tr key={item.id}>
            <td className="border border-slate-400 px-2 py-2 text-center">{index + 1}</td>
            <td className="border border-slate-400 px-2 py-2">{item.nis}</td>
            <td className="border border-slate-400 px-2 py-2">{item.nisn}</td>
            <td className="border border-slate-400 px-2 py-2 font-medium">{item.namaSiswa}</td>
            <td className="border border-slate-400 px-2 py-2">{item.jenisKelamin}</td>
            <td className="border border-slate-400 px-2 py-2">{item.tempatLahir}, {formatDateIndonesia(item.tanggalLahir)}</td>
            <td className="border border-slate-400 px-2 py-2 text-center">{item.kelas}{item.rombel}</td>
          </tr>
        )) : (
          <tr><td colSpan={7} className="border border-slate-400 px-3 py-8 text-center">Tidak ada data siswa pada kelas dan rombel yang dipilih.</td></tr>
        )}
      </tbody>
    </table>
  );
}
