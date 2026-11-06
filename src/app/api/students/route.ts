import { NextResponse } from "next/server";
import { getAllStudents, getStudents } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "1") {
    const data = await getAllStudents();
    return NextResponse.json({ data });
  }

  const result = await getStudents({
    q: searchParams.get("q") || undefined,
    kelas: searchParams.get("kelas") || undefined,
    jenisKelamin: searchParams.get("jenisKelamin") || undefined,
    usia: searchParams.get("usia") || undefined,
    statusSiswa: searchParams.get("statusSiswa") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortDir: (searchParams.get("sortDir") as "asc" | "desc" | null) || undefined,
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 10),
  });

  return NextResponse.json(result);
}
