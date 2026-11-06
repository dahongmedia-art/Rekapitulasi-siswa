import { AppShell } from "@/components/app-shell";
import { getAllAttendanceRecaps, getAllStudents, getBackups, getDashboardSummary, getMonthlyAgeRecap, getSchoolSettings, getSemesterAgeRecap, getYearlyAgeRecap } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const currentYear = new Date().getFullYear();
  const [students, settings, summary, backups, monthlyRecaps, yearlyAgeRecap, semesterOneRecap, semesterTwoRecap, attendanceRecaps] = await Promise.all([
    getAllStudents(),
    getSchoolSettings(),
    getDashboardSummary(),
    getBackups(),
    Promise.all(Array.from({ length: 12 }, (_, index) => getMonthlyAgeRecap(index + 1, currentYear))),
    getYearlyAgeRecap(currentYear),
    getSemesterAgeRecap(currentYear, 1),
    getSemesterAgeRecap(currentYear, 2),
    getAllAttendanceRecaps(),
  ]);

  return (
    <AppShell
      initialTab={tab}
      students={students}
      settings={settings}
      summary={summary}
      backups={backups}
      monthlyRecaps={monthlyRecaps}
      yearlyAgeRecap={yearlyAgeRecap}
      semesterOneRecap={semesterOneRecap}
      semesterTwoRecap={semesterTwoRecap}
      attendanceRecaps={attendanceRecaps}
    />
  );
}
