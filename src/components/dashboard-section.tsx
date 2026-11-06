import { Baby, BarChart3, PieChart, School, Users, VenusAndMars } from "lucide-react";
import { GenderPieChart, StudentBarChart } from "@/components/charts";
import { Badge, Card, CardContent, SectionTitle } from "@/components/ui";
import type { DashboardSummary } from "@/lib/types";

export function DashboardSection({ summary }: { summary: DashboardSummary }) {
  const stats = [
    { title: "Jumlah Siswa Laki-laki", value: summary.totalLakiLaki, icon: Users, color: "text-sky-600" },
    { title: "Jumlah Siswa Perempuan", value: summary.totalPerempuan, icon: VenusAndMars, color: "text-pink-600" },
    { title: "Total Seluruh Siswa", value: summary.totalSiswa, icon: BarChart3, color: "text-emerald-600" },
    { title: "Jumlah Siswa per Kelas", value: summary.perKelas.length, icon: School, color: "text-violet-600" },
    { title: "Rekap Siswa Berdasarkan Usia", value: summary.perUsia.length, icon: Baby, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Dashboard Utama" subtitle="Statistik siswa otomatis berubah berdasarkan data yang tersimpan di database." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <h3 className="mt-3 text-3xl font-bold text-slate-950">{item.value}</h3>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <Icon className={item.color} size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Grafik Jenis Kelamin</h3>
              <PieChart className="text-slate-400" size={20} />
            </div>
            <GenderPieChart
              data={[
                { name: "Laki-laki", value: summary.totalLakiLaki },
                { name: "Perempuan", value: summary.totalPerempuan },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Persentase Jenis Kelamin</h3>
              <Badge>Laki-laki {summary.persentaseLakiLaki}%</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm text-slate-600">
                  <span>Laki-laki</span>
                  <span>{summary.persentaseLakiLaki}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-sky-500" style={{ width: `${summary.persentaseLakiLaki}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm text-slate-600">
                  <span>Perempuan</span>
                  <span>{summary.persentasePerempuan}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-pink-500" style={{ width: `${summary.persentasePerempuan}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Grafik Jumlah Siswa Berdasarkan Usia</h3>
            <StudentBarChart
              data={summary.perUsia.map((item) => ({ usia: `${item.usia} th`, total: item.total, lakiLaki: item.lakiLaki, perempuan: item.perempuan }))}
              xKey="usia"
              bars={[
                { key: "lakiLaki", name: "Laki-laki", color: "#0284c7" },
                { key: "perempuan", name: "Perempuan", color: "#ec4899" },
                { key: "total", name: "Total", color: "#22c55e" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Grafik Jumlah Siswa Berdasarkan Kelas</h3>
            <StudentBarChart
              data={summary.perKelas.map((item) => ({ kelas: `Kelas ${item.kelas}`, lakiLaki: item.lakiLaki, perempuan: item.perempuan, total: item.total }))}
              xKey="kelas"
              bars={[
                { key: "lakiLaki", name: "Laki-laki", color: "#0284c7" },
                { key: "perempuan", name: "Perempuan", color: "#ec4899" },
                { key: "total", name: "Total", color: "#22c55e" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-lg font-semibold text-slate-950">Tabel Ringkas Rekap Siswa per Kelas</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">Kelas</th>
                  <th className="px-3 py-3">Laki-laki</th>
                  <th className="px-3 py-3">Perempuan</th>
                  <th className="px-3 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.perKelas.map((item) => (
                  <tr key={item.kelas} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium">Kelas {item.kelas}</td>
                    <td className="px-3 py-3">{item.lakiLaki}</td>
                    <td className="px-3 py-3">{item.perempuan}</td>
                    <td className="px-3 py-3">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
