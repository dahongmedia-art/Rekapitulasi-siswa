"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { getSchoolLogos } from "@/lib/branding";
import { BarChart3, DatabaseBackup, Download, FileSpreadsheet, Home, Menu, Printer, Settings, Users, Cake, ClipboardCheck, School } from "lucide-react";
import { AttendanceSection } from "@/components/attendance-section";
import { SchoolAttendanceSection } from "@/components/school-attendance-section";
import { BackupSection } from "@/components/backup-section";
import { DashboardSection } from "@/components/dashboard-section";
import { ExportSection } from "@/components/export-section";
import { ImportSection } from "@/components/import-section";
import { PrintSection } from "@/components/print-section";
import { RekapSection } from "@/components/rekap-section";
import { SettingsSection } from "@/components/settings-section";
import { StudentsSection } from "@/components/students-section";
import { UsiaSection } from "@/components/usia-section";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AttendancePeriod, AttendanceSelection } from "@/lib/attendance-summary";
import type { BackupSummaryRecord } from "@/lib/backup-format";
import type { AttendanceRecapRecord, DashboardSummary, MonthlyAgeRecap, SchoolSettingsRecord, SemesterAgeRecap, StudentRecord, YearlyAgeRecap } from "@/lib/types";

const menus = [
  { key: "dashboard", label: "🏠 Dashboard", icon: Home },
  { key: "students", label: "👨‍🎓 Data Siswa", icon: Users },
  { key: "rekap", label: "📊 Rekap Siswa", icon: BarChart3 },
  { key: "usia", label: "🎂 Rekap Usia", icon: Cake },
  { key: "attendance", label: "📅 Absensi per Kelas", icon: ClipboardCheck },
  { key: "school-attendance", label: "🏫 Absensi 1 Sekolah", icon: School },
  { key: "import", label: "📥 Import Data", icon: FileSpreadsheet },
  { key: "export", label: "📤 Export Data", icon: Download },
  { key: "print", label: "🖨️ Cetak Laporan", icon: Printer },
  { key: "backup", label: "💾 Backup & Restore", icon: DatabaseBackup },
  { key: "settings", label: "⚙️ Pengaturan", icon: Settings },
] as const;

export function AppShell({ students, settings, summary, backups, monthlyRecaps, yearlyAgeRecap, semesterOneRecap, semesterTwoRecap, attendanceRecaps, initialTab }: {
  students: StudentRecord[];
  settings: SchoolSettingsRecord;
  summary: DashboardSummary;
  backups: BackupSummaryRecord[];
  monthlyRecaps: MonthlyAgeRecap[];
  yearlyAgeRecap: YearlyAgeRecap;
  semesterOneRecap: SemesterAgeRecap;
  semesterTwoRecap: SemesterAgeRecap;
  attendanceRecaps: AttendanceRecapRecord[];
  initialTab?: string;
}) {
  const [active, setActive] = useState<(typeof menus)[number]["key"]>(() => menus.find((menu) => menu.key === initialTab)?.key || "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attendanceSelection, setAttendanceSelection] = useState<AttendanceSelection>();
  const [schoolAttendancePeriod, setSchoolAttendancePeriod] = useState<AttendancePeriod>();
  const logos = getSchoolLogos(settings);

  const content = useMemo(() => {
    switch (active) {
      case "students": return <StudentsSection students={students} />;
      case "rekap": return <RekapSection summary={summary} />;
      case "usia": return <UsiaSection students={students} />;
      case "attendance": return <AttendanceSection students={students} attendanceRecaps={attendanceRecaps} settings={settings} initialSelection={attendanceSelection} onOpenSchool={(period) => { setSchoolAttendancePeriod(period); setActive("school-attendance"); }} />;
      case "school-attendance": return <SchoolAttendanceSection students={students} attendanceRecaps={attendanceRecaps} settings={settings} initialPeriod={schoolAttendancePeriod} onOpenClass={(selection) => { setAttendanceSelection(selection); setSchoolAttendancePeriod({ bulan: selection.bulan, tahun: selection.tahun }); setActive("attendance"); }} />;
      case "import": return <ImportSection existingNis={students.map((item) => item.nis)} existingNisn={students.map((item) => item.nisn)} />;
      case "export": return <ExportSection students={students} settings={settings} />;
      case "print": return <PrintSection students={students} settings={settings} summary={summary} monthlyRecaps={monthlyRecaps} yearlyAgeRecap={yearlyAgeRecap} semesterOneRecap={semesterOneRecap} semesterTwoRecap={semesterTwoRecap} attendanceRecaps={attendanceRecaps} />;
      case "backup": return <BackupSection students={students} settings={settings} attendanceRecaps={attendanceRecaps} backups={backups} onOpenData={() => setActive("students")} onOpenImport={() => setActive("import")} />;
      case "settings": return <SettingsSection settings={settings} />;
      default: return <DashboardSection summary={summary} />;
    }
  }, [active, backups, settings, students, summary, monthlyRecaps, yearlyAgeRecap, semesterOneRecap, semesterTwoRecap, attendanceRecaps, attendanceSelection, schoolAttendancePeriod]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:min-h-0 print:bg-white">
      <div className="flex min-h-screen print:block print:min-h-0">
        <aside className={cn("print:hidden fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-slate-200 bg-white p-5 transition-transform lg:static lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5">
              {logos.school || logos.government ? <Image unoptimized priority src={logos.school || logos.government} alt={logos.school ? `Logo ${settings.namaSekolah}` : "Logo Kabupaten Bandung Barat"} width={48} height={58} className="h-full w-full object-contain" /> : <span className="text-2xl">🎓</span>}
            </div>
            <div><h1 className="text-lg font-bold text-slate-950">{APP_NAME}</h1><p className="text-sm text-slate-500">Administrasi sekolah</p></div>
          </div>
          <nav className="space-y-2" aria-label="Navigasi utama">
            {menus.map((menu) => {
              const Icon = menu.icon;
              return <button key={menu.key} onClick={() => { setActive(menu.key); setMobileOpen(false); }} aria-current={active === menu.key ? "page" : undefined} className={cn("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition", active === menu.key ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100")}><Icon size={18} /><span>{menu.label}</span></button>;
            })}
          </nav>
          <button onClick={() => { setActive("backup"); setMobileOpen(false); }} className="mt-6 w-full rounded-2xl border border-sky-100 bg-sky-50 p-3 text-left"><p className="text-sm font-semibold text-sky-900">{students.length} siswa tersimpan</p><p className="mt-1 text-xs leading-5 text-sky-700">Unduh backup untuk menyimpan salinan di perangkat.</p></button>
        </aside>
        <div className="min-w-0 flex-1 lg:ml-0">
          <header className="print:hidden sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                {logos.government ? <Image unoptimized src={logos.government} alt="Logo Kabupaten Bandung Barat" width={40} height={44} className="h-11 w-10 shrink-0 object-contain" /> : null}
                <div className="min-w-0"><p className="text-xs text-slate-500 md:text-sm">Selamat datang · Administrasi sekolah</p><h2 className="truncate text-base font-bold text-slate-950 md:text-xl">{settings.namaSekolah || APP_NAME}</h2><p className="mt-0.5 text-xs text-slate-400">NPSN {settings.npsn || "-"} · {students.length} siswa tersimpan</p></div>
                {logos.school ? <Image unoptimized src={logos.school} alt={`Logo ${settings.namaSekolah}`} width={40} height={48} className="ml-1 hidden h-12 w-10 shrink-0 object-contain sm:block" /> : null}
              </div>
              <button aria-label="Buka atau tutup menu" aria-expanded={mobileOpen} className="shrink-0 rounded-2xl bg-slate-100 p-3 lg:hidden" onClick={() => setMobileOpen((previous) => !previous)}><Menu size={20} /></button>
            </div>
          </header>
          <main className="p-4 print:p-0 md:p-6">{content}</main>
        </div>
      </div>
    </div>
  );
}
