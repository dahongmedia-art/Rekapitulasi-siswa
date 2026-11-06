import { differenceInYears, format } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function parseDateInput(value: string) {
  if (!value) return null;

  const normalized = value.includes("/") ? value.replace(/\//g, "-") : value;
  const parts = normalized.split("-");

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const [day, month, year] = parts;
    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const direct = new Date(value);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

export function calculateAge(dateString: string) {
  const date = parseDateInput(dateString);
  if (!date) return 0;
  return differenceInYears(new Date(), date);
}

export function calculateAgeAt(dateString: string, atDate: Date) {
  const date = parseDateInput(dateString);
  if (!date) return 0;
  return differenceInYears(atDate, date);
}

export function buildAgeRecapAt(
  students: Array<{ jenisKelamin: string; tanggalLahir: string }>,
  atDate: Date
): Array<{ usia: number; lakiLaki: number; perempuan: number; total: number }> {
  const ageMap = new Map<number, { usia: number; lakiLaki: number; perempuan: number; total: number }>();

  for (const student of students) {
    const usia = calculateAgeAt(student.tanggalLahir, atDate);
    const entry = ageMap.get(usia) ?? { usia, lakiLaki: 0, perempuan: 0, total: 0 };
    if (student.jenisKelamin === "Laki-laki") entry.lakiLaki += 1;
    if (student.jenisKelamin === "Perempuan") entry.perempuan += 1;
    entry.total += 1;
    ageMap.set(usia, entry);
  }

  return Array.from(ageMap.values()).sort((a, b) => a.usia - b.usia);
}

export function getMonthsForAgePeriod(periode: string, semester: string, tahun: number, bulan: number) {
  if (periode === "tahun") return Array.from({ length: 12 }, (_, index) => index + 1);
  if (periode === "semester") return Array.from({ length: 6 }, (_, index) => (semester === "2" ? index + 7 : index + 1));
  return [bulan];
}

export function getMonthName(month: number) {
  const date = new Date(2025, month - 1, 1);
  return format(date, "LLLL", { locale: id });
}

export function formatDateIndonesia(value: string | Date) {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  if (!date) return "-";
  return format(date, "dd MMMM yyyy", { locale: id });
}

export function formatDateTimeIndonesia(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMMM yyyy HH:mm", { locale: id });
}

export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
