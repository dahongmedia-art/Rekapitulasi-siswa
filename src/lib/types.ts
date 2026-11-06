export type StudentRecord = {
  id: number;
  nis: string;
  nisn: string;
  namaSiswa: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  usia: number;
  kelas: string;
  rombel: string;
  alamat: string;
  namaOrangTua: string;
  statusSiswa: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SchoolSettingsRecord = {
  id?: number;
  namaSekolah: string;
  npsn: string;
  alamat: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  tahunPelajaran: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  namaOperator: string;
  logoPemerintah?: string;
  logoSekolah?: string;
  updatedAt?: string;
};

export type DashboardSummary = {
  totalSiswa: number;
  totalLakiLaki: number;
  totalPerempuan: number;
  persentaseLakiLaki: number;
  persentasePerempuan: number;
  perKelas: Array<{ kelas: string; lakiLaki: number; perempuan: number; total: number }>;
  perUsia: Array<{ usia: number; lakiLaki: number; perempuan: number; total: number }>;
};

export type AgeRecapRow = {
  usia: number;
  lakiLaki: number;
  perempuan: number;
  total: number;
};

export type MonthlyAgeRecap = {
  bulan: number;
  tahun: number;
  label: string;
  perUsia: AgeRecapRow[];
  totalSiswa: number;
};

export type SemesterAgeRecap = {
  semester: 1 | 2;
  tahun: number;
  months: MonthlyAgeRecap[];
};

export type YearlyAgeRecap = {
  tahun: number;
  months: MonthlyAgeRecap[];
};

export type AttendanceInput = {
  studentId: number;
  kelas: string;
  rombel: string;
  bulan: number;
  tahun: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  catatan: string;
};

export type AttendanceRecapRecord = AttendanceInput & {
  id: number;
  nis: string;
  nisn: string;
  namaSiswa: string;
  rombel: string;
  updatedAt?: string;
};

export type StudentFilters = {
  q?: string;
  kelas?: string;
  jenisKelamin?: string;
  usia?: string;
  statusSiswa?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ImportPreviewRow = {
  rowNumber: number;
  data: Omit<StudentRecord, "id" | "usia">;
  errors: string[];
  duplicateInFile: boolean;
  duplicateExisting: boolean;
};
