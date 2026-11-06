export const APP_NAME = "REKAP SISWA";

export const GENDER_OPTIONS = ["Laki-laki", "Perempuan"] as const;
export const CLASS_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;
export const ROMBEL_OPTIONS = ["A", "B"] as const;
export const STATUS_OPTIONS = ["Aktif", "Mutasi Masuk", "Mutasi Keluar", "Lulus"] as const;

export const STUDENT_TEMPLATE_HEADERS = [
  "No",
  "NIS",
  "NISN",
  "Nama Siswa",
  "Jenis Kelamin",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Kelas",
  "Rombel",
  "Alamat",
  "Nama Orang Tua/Wali",
  "Status Siswa",
] as const;

export const DEFAULT_SCHOOL_SETTINGS = {
  namaSekolah: "SD NEGERI CIGENTUR",
  npsn: "20208186",
  alamat: "",
  desaKelurahan: "",
  kecamatan: "Cikalongwetan",
  kabupaten: "Kabupaten Bandung Barat",
  provinsi: "Jawa Barat",
  tahunPelajaran: "",
  namaKepalaSekolah: "",
  nipKepalaSekolah: "",
  namaOperator: "",
  logoPemerintah: "/images/logo-bandung-barat.png",
  logoSekolah: "",
};
