import { Card, CardContent, SectionTitle } from "@/components/ui";
import type { DashboardSummary } from "@/lib/types";

export function RekapSection({ summary }: { summary: DashboardSummary }) {
  const totalL = summary.perKelas.reduce((sum, item) => sum + item.lakiLaki, 0);
  const totalP = summary.perKelas.reduce((sum, item) => sum + item.perempuan, 0);
  const total = summary.perKelas.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="Rekap Jumlah Siswa" subtitle="Rekap dihitung otomatis dari database siswa." />
      <Card>
        <CardContent>
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
                <tr className="bg-slate-50 font-bold text-slate-950">
                  <td className="px-3 py-3">TOTAL</td>
                  <td className="px-3 py-3">{totalL}</td>
                  <td className="px-3 py-3">{totalP}</td>
                  <td className="px-3 py-3">{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
