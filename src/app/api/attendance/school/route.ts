import { NextResponse } from "next/server";
import { getAllAttendanceRecaps, getAllStudents } from "@/lib/data";
import { buildSchoolAttendanceSummary, isValidAttendancePeriod } from "@/lib/attendance-summary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const now = new Date();
  const bulan = params.has("bulan") ? Number(params.get("bulan")) : now.getMonth() + 1;
  const tahun = params.has("tahun") ? Number(params.get("tahun")) : now.getFullYear();
  if (!isValidAttendancePeriod(bulan, tahun)) {
    return NextResponse.json({ message: "Pilih bulan 1–12 dan tahun 2000–2100 yang valid." }, { status: 400 });
  }

  try {
    const [students, attendance] = await Promise.all([getAllStudents(), getAllAttendanceRecaps({ bulan, tahun })]);
    const summary = buildSchoolAttendanceSummary(students, attendance, bulan, tahun);
    return NextResponse.json({ summary, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Rekap absensi sekolah belum dapat dimuat. Coba kembali." }, { status: 500 });
  }
}
