"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, ImagePlus, RotateCcw, Save, School, Trash2, Upload } from "lucide-react";
import { saveSettingsAction } from "@/app/actions";
import { SchoolLetterhead } from "@/components/school-letterhead";
import { Button, Card, CardContent, Input, SectionTitle, Textarea } from "@/components/ui";
import { DEFAULT_GOVERNMENT_LOGO, getSchoolLogos, MAX_LOGO_UPLOAD_BYTES } from "@/lib/branding";
import type { SchoolSettingsRecord } from "@/lib/types";

type LogoKind = "pemerintah" | "sekolah";

const SETTINGS_FIELDS = [
  { name: "namaSekolah", label: "Nama Sekolah", placeholder: "SD NEGERI CIGENTUR" },
  { name: "npsn", label: "NPSN", placeholder: "20208186" },
  { name: "desaKelurahan", label: "Desa / Kelurahan", placeholder: "Desa / kelurahan sekolah" },
  { name: "kecamatan", label: "Kecamatan", placeholder: "Cikalongwetan" },
  { name: "kabupaten", label: "Kabupaten / Kota", placeholder: "Kabupaten Bandung Barat" },
  { name: "provinsi", label: "Provinsi", placeholder: "Jawa Barat" },
  { name: "tahunPelajaran", label: "Tahun Pelajaran", placeholder: "Contoh: 2026/2027" },
  { name: "namaKepalaSekolah", label: "Nama Kepala Sekolah", placeholder: "Nama lengkap kepala sekolah" },
  { name: "nipKepalaSekolah", label: "NIP Kepala Sekolah", placeholder: "NIP kepala sekolah" },
  { name: "namaOperator", label: "Nama Operator", placeholder: "Nama operator sekolah" },
] as const;

export function SettingsSection({ settings }: { settings: SchoolSettingsRecord }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [workingLogo, setWorkingLogo] = useState<LogoKind | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) {
      setForm((previous) => ({
        ...previous,
        logoPemerintah: settings.logoPemerintah,
        logoSekolah: settings.logoSekolah,
        updatedAt: settings.updatedAt,
      }));
    } else {
      setForm(settings);
    }
  }, [settings]);

  const logos = getSchoolLogos(form);

  function updateField(name: keyof SchoolSettingsRecord, value: string) {
    dirty.current = true;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function uploadLogo(kind: LogoKind, file: File) {
    setIsError(false);
    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      setMessage("Ukuran file maksimal 5 MB.");
      setIsError(true);
      return;
    }
    setWorkingLogo(kind);
    setMessage("Mengunggah logo...");
    try {
      const payload = new FormData();
      payload.append("kind", kind);
      payload.append("file", file);
      const response = await fetch("/api/branding", { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal mengunggah logo.");
      setForm((previous) => ({ ...previous, [kind === "sekolah" ? "logoSekolah" : "logoPemerintah"]: result.logo }));
      setMessage(`${result.message} Logo sudah dapat digunakan di laporan cetak dan PDF.`);
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Gagal mengunggah logo.");
    } finally {
      setWorkingLogo(null);
    }
  }

  async function resetLogo(kind: LogoKind) {
    if (!window.confirm(kind === "sekolah" ? "Hapus logo sekolah dari pengaturan?" : "Gunakan kembali logo Kabupaten Bandung Barat bawaan?")) return;
    setWorkingLogo(kind);
    setIsError(false);
    try {
      const response = await fetch("/api/branding", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal mengubah logo.");
      setForm((previous) => ({ ...previous, [kind === "sekolah" ? "logoSekolah" : "logoPemerintah"]: result.logo }));
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Gagal mengubah logo.");
    } finally {
      setWorkingLogo(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    startTransition(async () => {
      try {
        const result = await saveSettingsAction(form);
        setMessage(result.message);
        setIsError(!result.success);
        if (result.success) {
          dirty.current = false;
          router.refresh();
        }
      } catch {
        setIsError(true);
        setMessage("Pengaturan belum tersimpan. Periksa koneksi lalu coba kembali.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Pengaturan Sekolah" subtitle="Atur identitas sekolah dan logo untuk seluruh laporan, cetak absensi, serta PDF." />

      {message ? (
        <div role={isError ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${isError ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Logo Sekolah &amp; Pemerintah Daerah</h3>
            <p className="mt-1 text-sm text-slate-500">Gunakan file logo asli. Gambar tetap proporsional, tidak dipotong, dan tersimpan di database.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {([
              { kind: "pemerintah", title: "Logo Kabupaten Bandung Barat", description: "Ditampilkan di sisi kiri kop laporan.", source: logos.government, icon: Building2 },
              { kind: "sekolah", title: "Logo SD Negeri Cigentur", description: "Ditampilkan di sisi kanan kop dan identitas aplikasi.", source: logos.school, icon: School },
            ] as const).map((item) => {
              const Icon = item.icon;
              const busy = workingLogo === item.kind;
              const canReset = item.kind === "sekolah" ? Boolean(item.source) : item.source !== DEFAULT_GOVERNMENT_LOGO;
              return (
                <div key={item.kind} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-32 w-28 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-2">
                      {item.source ? (
                        <Image unoptimized src={item.source} alt={item.title} width={100} height={120} className="h-full w-full object-contain" />
                      ) : (
                        <div className="text-center text-slate-400"><ImagePlus className="mx-auto" size={32} /><p className="mt-2 text-xs">Belum ada logo</p></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Icon size={20} className="mb-2 text-sky-600" />
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      <p className="mt-2 text-xs font-medium text-emerald-700">{item.source ? "Logo tersedia" : "Unggah gambar sekolah untuk memasangnya"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white ${workingLogo || pending ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-sky-700"}`}>
                      <Upload size={16} /> {busy ? "Mengunggah..." : item.source ? "Ganti Logo" : "Unggah Logo"}
                      <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" disabled={Boolean(workingLogo) || pending} onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadLogo(item.kind, file);
                        event.currentTarget.value = "";
                      }} />
                    </label>
                    {canReset ? (
                      <Button variant="ghost" disabled={Boolean(workingLogo) || pending} onClick={() => void resetLogo(item.kind)} className="gap-2 px-3 py-2">
                        {item.kind === "sekolah" ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                        {item.kind === "sekolah" ? "Hapus" : "Logo Bawaan"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-5 text-slate-500">Format PNG, JPG, atau WebP, maksimal 5 MB per gambar. Logo sekolah belum dipasang otomatis dari lampiran percakapan; unggah file aslinya di sini agar gambar tetap persis seperti yang dikirim.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-5 text-lg font-semibold text-slate-950">Identitas &amp; Penanggung Jawab Sekolah</h3>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {SETTINGS_FIELDS.map((field, index) => (
              <div key={field.name}>
                <label htmlFor={`settings-${field.name}`} className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</label>
                <Input id={`settings-${field.name}`} placeholder={field.placeholder} value={form[field.name]} required={index === 0} onChange={(event) => updateField(field.name, event.target.value)} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label htmlFor="school-address" className="mb-1.5 block text-sm font-medium text-slate-700">Alamat Sekolah</label>
              <Textarea id="school-address" rows={3} placeholder="Alamat lengkap sekolah untuk kop laporan" value={form.alamat} onChange={(event) => updateField("alamat", event.target.value)} />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button type="submit" disabled={pending || Boolean(workingLogo)} className="gap-2"><Save size={17} /> {pending ? "Menyimpan..." : "Simpan Pengaturan"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-2 text-lg font-semibold text-slate-950">Pratinjau Kop Laporan</h3>
          <p className="mb-6 text-sm text-slate-500">Susunan logo dan identitas ini digunakan pada semua laporan cetak.</p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-7"><SchoolLetterhead settings={form} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
