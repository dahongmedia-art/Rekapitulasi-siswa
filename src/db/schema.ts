import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const students = pgTable(
  "students",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nis: varchar("nis", { length: 50 }).notNull(),
    nisn: varchar("nisn", { length: 50 }).notNull(),
    namaSiswa: varchar("nama_siswa", { length: 255 }).notNull(),
    jenisKelamin: varchar("jenis_kelamin", { length: 20 }).notNull(),
    tempatLahir: varchar("tempat_lahir", { length: 255 }).notNull(),
    tanggalLahir: varchar("tanggal_lahir", { length: 20 }).notNull(),
    kelas: varchar("kelas", { length: 10 }).notNull(),
    rombel: varchar("rombel", { length: 100 }).notNull(),
    alamat: text("alamat").notNull(),
    namaOrangTua: varchar("nama_orang_tua", { length: 255 }).notNull(),
    statusSiswa: varchar("status_siswa", { length: 50 }).notNull().default("Aktif"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nisIdx: uniqueIndex("students_nis_idx").on(table.nis),
    nisnIdx: uniqueIndex("students_nisn_idx").on(table.nisn),
  })
);

export const attendanceRecaps = pgTable(
  "attendance_recaps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    kelas: varchar("kelas", { length: 10 }).notNull(),
    rombel: varchar("rombel", { length: 10 }).notNull().default("A"),
    bulan: integer("bulan").notNull(),
    tahun: integer("tahun").notNull(),
    hadir: integer("hadir").notNull().default(0),
    sakit: integer("sakit").notNull().default(0),
    izin: integer("izin").notNull().default(0),
    alpa: integer("alpa").notNull().default(0),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    studentPeriodIdx: uniqueIndex("attendance_student_period_idx").on(table.studentId, table.bulan, table.tahun),
  })
);

export const schoolSettings = pgTable("school_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  namaSekolah: varchar("nama_sekolah", { length: 255 }).notNull().default("REKAP SISWA"),
  npsn: varchar("npsn", { length: 50 }).notNull().default(""),
  alamat: text("alamat").notNull().default(""),
  desaKelurahan: varchar("desa_kelurahan", { length: 255 }).notNull().default(""),
  kecamatan: varchar("kecamatan", { length: 255 }).notNull().default(""),
  kabupaten: varchar("kabupaten", { length: 255 }).notNull().default(""),
  provinsi: varchar("provinsi", { length: 255 }).notNull().default(""),
  tahunPelajaran: varchar("tahun_pelajaran", { length: 50 }).notNull().default(""),
  namaKepalaSekolah: varchar("nama_kepala_sekolah", { length: 255 }).notNull().default(""),
  nipKepalaSekolah: varchar("nip_kepala_sekolah", { length: 100 }).notNull().default(""),
  namaOperator: varchar("nama_operator", { length: 255 }).notNull().default(""),
  logoPemerintah: text("logo_pemerintah").notNull().default("/images/logo-bandung-barat.png"),
  logoSekolah: text("logo_sekolah").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appBackups = pgTable("app_backups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  label: varchar("label", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(),
  isManual: boolean("is_manual").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
