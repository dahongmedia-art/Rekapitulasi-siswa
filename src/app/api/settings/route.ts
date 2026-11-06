import { NextResponse } from "next/server";
import { getSchoolSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSchoolSettings();
  return NextResponse.json({ settings });
}
