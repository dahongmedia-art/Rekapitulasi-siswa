import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { schoolSettings } from "@/db/schema";
import { ensureSchoolSettings } from "@/lib/data";
import { DEFAULT_GOVERNMENT_LOGO, MAX_LOGO_UPLOAD_BYTES, MAX_STORED_LOGO_BYTES } from "@/lib/branding";

export const runtime = "nodejs";

function validKind(value: unknown): value is "sekolah" | "pemerintah" {
  return value === "sekolah" || value === "pemerintah";
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ message: "Permintaan unggah tidak diizinkan." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > MAX_LOGO_UPLOAD_BYTES + 100_000) {
    return NextResponse.json({ message: "Ukuran gambar maksimal 5 MB." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if (!validKind(kind) || !(file instanceof File)) {
      return NextResponse.json({ message: "Pilih jenis logo dan file gambar yang valid." }, { status: 400 });
    }
    if (!file.size || file.size > MAX_LOGO_UPLOAD_BYTES) {
      return NextResponse.json({ message: "Ukuran gambar harus lebih dari 0 dan maksimal 5 MB." }, { status: 400 });
    }

    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 24_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["png", "jpeg", "webp"].includes(metadata.format)) {
      return NextResponse.json({ message: "Gunakan gambar PNG, JPG, atau WebP." }, { status: 400 });
    }
    const result = await image.rotate().resize({ width: 800, height: 1000, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if (result.length > MAX_STORED_LOGO_BYTES) {
      return NextResponse.json({ message: "Gambar terlalu kompleks. Gunakan file logo dengan resolusi lebih kecil." }, { status: 400 });
    }

    const logo = `data:image/png;base64,${result.toString("base64")}`;
    const current = await ensureSchoolSettings();
    await db.update(schoolSettings).set({
      ...(kind === "sekolah" ? { logoSekolah: logo } : { logoPemerintah: logo }),
      updatedAt: new Date(),
    }).where(eq(schoolSettings.id, current.id));
    revalidatePath("/");
    return NextResponse.json({ success: true, kind, logo, message: `Logo ${kind === "sekolah" ? "sekolah" : "daerah"} berhasil disimpan.` });
  } catch (error) {
    console.error("Logo upload failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Gambar tidak dapat dibaca atau disimpan. Coba file PNG/JPG lain." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ message: "Permintaan tidak diizinkan." }, { status: 403 });
  try {
    const payload = await request.json();
    if (!validKind(payload.kind)) return NextResponse.json({ message: "Jenis logo tidak valid." }, { status: 400 });
    const current = await ensureSchoolSettings();
    const logo = payload.kind === "pemerintah" ? DEFAULT_GOVERNMENT_LOGO : "";
    await db.update(schoolSettings).set({
      ...(payload.kind === "sekolah" ? { logoSekolah: logo } : { logoPemerintah: logo }),
      updatedAt: new Date(),
    }).where(eq(schoolSettings.id, current.id));
    revalidatePath("/");
    return NextResponse.json({ success: true, logo, message: payload.kind === "sekolah" ? "Logo sekolah dihapus." : "Logo daerah bawaan dipulihkan." });
  } catch {
    return NextResponse.json({ message: "Gagal mengubah logo." }, { status: 500 });
  }
}
