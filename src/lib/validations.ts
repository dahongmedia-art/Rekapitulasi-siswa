import { z } from "zod";
import { CLASS_OPTIONS, GENDER_OPTIONS, ROMBEL_OPTIONS, STATUS_OPTIONS, STUDENT_TEMPLATE_HEADERS } from "@/lib/constants";
import { parseDateInput } from "@/lib/utils";

export const studentSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  nisn: z.string().min(1, "NISN wajib diisi"),
  namaSiswa: z.string().min(1, "Nama siswa wajib diisi"),
  jenisKelamin: z.enum(GENDER_OPTIONS, { message: "Jenis kelamin tidak valid" }),
  tempatLahir: z.string().min(1, "Tempat lahir wajib diisi"),
  tanggalLahir: z.string().refine((value) => !!parseDateInput(value), "Tanggal lahir tidak valid"),
  kelas: z.enum(CLASS_OPTIONS, { message: "Kelas tidak valid" }),
  rombel: z.enum(ROMBEL_OPTIONS, { message: "Rombel harus A atau B" }),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  namaOrangTua: z.string().min(1, "Nama orang tua/wali wajib diisi"),
  statusSiswa: z.enum(STATUS_OPTIONS, { message: "Status siswa tidak valid" }),
});

export const attendanceSchema = z
  .object({
    studentId: z.number().int().positive("Siswa tidak valid"),
    kelas: z.enum(CLASS_OPTIONS, { message: "Kelas tidak valid" }),
    rombel: z.enum(ROMBEL_OPTIONS, { message: "Rombel harus A atau B" }),
    bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2000).max(2100),
    hadir: z.number().int().min(0).max(31),
    sakit: z.number().int().min(0).max(31),
    izin: z.number().int().min(0).max(31),
    alpa: z.number().int().min(0).max(31),
    catatan: z.string().max(500),
  })
  .refine((value) => value.hadir + value.sakit + value.izin + value.alpa <= 31, {
    message: "Jumlah hari absensi tidak boleh melebihi 31 hari",
  });

export const schoolSettingsSchema = z.object({
  namaSekolah: z.string().min(1, "Nama sekolah wajib diisi"),
  npsn: z.string(),
  alamat: z.string(),
  desaKelurahan: z.string(),
  kecamatan: z.string(),
  kabupaten: z.string(),
  provinsi: z.string(),
  tahunPelajaran: z.string(),
  namaKepalaSekolah: z.string(),
  nipKepalaSekolah: z.string(),
  namaOperator: z.string(),
  logoPemerintah: z.string().max(750_000, "Ukuran logo terlalu besar").refine((value) => value === "" || value === "/images/logo-bandung-barat.png" || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value), "Format logo daerah tidak valid").optional(),
  logoSekolah: z.string().max(750_000, "Ukuran logo terlalu besar").refine((value) => value === "" || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value), "Format logo sekolah tidak valid").optional(),
});

export function validateImportHeaders(headers: string[]) {
  return STUDENT_TEMPLATE_HEADERS.every((header, index) => (headers[index] ?? "").trim() === header);
}
