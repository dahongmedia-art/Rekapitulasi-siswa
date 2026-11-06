"use client";

import { useMemo, useState } from "react";
import { StudentBarChart } from "@/components/charts";
import { Card, CardContent, SectionTitle, Select } from "@/components/ui";
import { CLASS_OPTIONS, ROMBEL_OPTIONS } from "@/lib/constants";
import { buildAgeRecapAt, getMonthName } from "@/lib/utils";
import type { StudentRecord } from "@/lib/types";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export function UsiaSection({ students }: { students: StudentRecord[] }) {
  const now = new Date();
  const [scope, setScope] = useState("all");
  const [kelas, setKelas] = useState("1");
  const [rombel, setRombel] = useState("A");
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    students.forEach((student) => {
      const year = Number(String(student.tanggalLahir).slice(0, 4));
      if (year > 2000) set.add(tahun);
    });
    for (let offset = -3; offset <= 1; offset += 1) set.add(now.getFullYear() + offset);
    return Array.from(set).sort((a, b) => a - b);
  }, [students, now, tahun]);

  const filteredStudents = useMemo(
    () =>
      scope === "all"
        ? students
        : students.filter((item) => item.kelas === kelas && item.rombel.trim().toUpperCase() === rombel),
    [students, scope, kelas, rombel]
  );

  const scopeLabel = scope === "all" ? "Seluruh Sekolah" : `Kelas ${kelas}${rombel}`;

  const perUsia = useMemo(
    () => buildAgeRecapAt(filteredStudents, new Date(Number(tahun), Number(bulan), 0)),
    [filteredStudents, tahun, bulan]
  );

  const totalLakiLaki = filteredStudents.filter((item) => item.jenisKelamin === "Laki-laki").length;
  const totalPerempuan = filteredStudents.filter((item) => item.jenisKelamin === "Perempuan").length;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Rekap Usia Siswa"
        subtitle="Usia dihitung otomatis dari tanggal lahir per akhir bulan. Pilih seluruh sekolah atau satu kelas dan rombel."
      />

      <Card>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Ruas Data</label>
              <Select value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="all">Semua Kelas (1 Sekolah)</option>
                <option value="class">Per Kelas &amp; Rombel</option>
              </Select>
            </div>
            {scope === "class" ? (
              <>
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
              </>
            ) : null}
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
              <Select value={tahun} onChange={(event) => setTahun(Number(event.target.value))}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-sky-100 px-4 py-2 font-semibold text-sky-700">Periode: {getMonthName(bulan)} {tahun}</span>
            <span className="rounded-full bg-violet-100 px-4 py-2 font-semibold text-violet-700">{scopeLabel}</span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              Laki-laki {totalLakiLaki} • Perempuan {totalPerempuan} • Total {filteredStudents.length}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-lg font-semibold text-slate-950">
            Tabel Rekap Usia - {scopeLabel} - {getMonthName(bulan)} {tahun}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">Usia</th>
                  <th className="px-3 py-3">Laki-laki</th>
                  <th className="px-3 py-3">Perempuan</th>
                  <th className="px-3 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {perUsia.length ? (
                  perUsia.map((item) => (
                    <tr key={item.usia} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium">{item.usia} tahun</td>
                      <td className="px-3 py-3">{item.lakiLaki}</td>
                      <td className="px-3 py-3">{item.perempuan}</td>
                      <td className="px-3 py-3">{item.total}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                      Belum ada data siswa untuk {scopeLabel}.
                    </td>
                  </tr>
                )}
              </tbody>
              {perUsia.length ? (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-950">
                    <td className="px-3 py-3">TOTAL</td>
                    <td className="px-3 py-3">{totalLakiLaki}</td>
                    <td className="px-3 py-3">{totalPerempuan}</td>
                    <td className="px-3 py-3">{filteredStudents.length}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-lg font-semibold text-slate-950">
            Grafik Batang Berdasarkan Usia - {scopeLabel}
          </h3>
          <StudentBarChart
            data={perUsia.map((item) => ({ usia: `${item.usia} th`, lakiLaki: item.lakiLaki, perempuan: item.perempuan, total: item.total }))}
            xKey="usia"
            bars={[
              { key: "lakiLaki", name: "Laki-laki", color: "#0284c7" },
              { key: "perempuan", name: "Perempuan", color: "#ec4899" },
              { key: "total", name: "Total", color: "#22c55e" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
