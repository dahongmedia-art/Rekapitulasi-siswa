import { NextResponse } from "next/server";
import { getDashboardSummary, getSchoolSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [summary, settings] = await Promise.all([getDashboardSummary(), getSchoolSettings()]);
  return NextResponse.json({ summary, settings, generatedAt: new Date().toISOString() });
}
