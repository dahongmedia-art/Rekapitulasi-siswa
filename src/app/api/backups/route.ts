import { NextResponse } from "next/server";
import { getBackups } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const backups = await getBackups();
  return NextResponse.json({ backups }, { headers: { "Cache-Control": "no-store" } });
}
