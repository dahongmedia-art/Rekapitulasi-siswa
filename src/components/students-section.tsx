"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteStudentAction } from "@/app/actions";
import { StudentFormModal } from "@/components/student-form-modal";
import { Badge, Button, Card, CardContent, Input, SectionTitle, Select } from "@/components/ui";
import { CLASS_OPTIONS, GENDER_OPTIONS, ROMBEL_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDateIndonesia } from "@/lib/utils";
import type { StudentRecord } from "@/lib/types";

export function StudentsSection({ students }: { students: StudentRecord[] }) {
  const [query, setQuery] = useState("");
  const [kelas, setKelas] = useState("");
  const [rombel, setRombel] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [usia, setUsia] = useState("");
  const [statusSiswa, setStatusSiswa] = useState("");
  const [sortBy, setSortBy] = useState<keyof StudentRecord>("namaSiswa");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const pageSize = 10;

  const ageOptions = useMemo(() => Array.from(new Set(students.map((item) => item.usia))).sort((a, b) => a - b), [students]);

  const filtered = useMemo(() => {
    const rows = students
      .filter((item) => {
        const q = query.toLowerCase();
        return !q || item.namaSiswa.toLowerCase().includes(q) || item.nisn.toLowerCase().includes(q) || item.nis.toLowerCase().includes(q);
      })
      .filter((item) => (!kelas ? true : item.kelas === kelas))
      .filter((item) => (!rombel ? true : item.rombel.toUpperCase() === rombel))
      .filter((item) => (!jenisKelamin ? true : item.jenisKelamin === jenisKelamin))
      .filter((item) => (!usia ? true : String(item.usia) === usia))
      .filter((item) => (!statusSiswa ? true : item.statusSiswa === statusSiswa));

    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      const aValue = String(a[sortBy] ?? "");
      const bValue = String(b[sortBy] ?? "");
      return aValue.localeCompare(bValue, "id") * direction;
    });

    return rows;
  }, [students, query, kelas, rombel, jenisKelamin, usia, statusSiswa, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function handleDelete(id: number) {
    const ok = window.confirm("Yakin ingin menghapus data siswa ini?");
    if (!ok) return;
    startTransition(async () => {
      await deleteStudentAction(id);
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Data Siswa"
        subtitle="Kelola data siswa: tambah, edit, hapus, cari, filter, sortir, dan pagination."
        action={<StudentFormModal onDone={() => setEditing(null)} />}
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Input placeholder="Cari nama / NIS / NISN" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={kelas} onChange={(e) => setKelas(e.target.value)}>
              <option value="">Semua Kelas</option>
              {CLASS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  Kelas {item}
                </option>
              ))}
            </Select>
            <Select value={rombel} onChange={(e) => setRombel(e.target.value)}>
              <option value="">Semua Rombel</option>
              {ROMBEL_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  Rombel {item}
                </option>
              ))}
            </Select>
            <Select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}>
              <option value="">Semua Gender</option>
              {GENDER_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select value={usia} onChange={(e) => setUsia(e.target.value)}>
              <option value="">Semua Usia</option>
              {ageOptions.map((item) => (
                <option key={item} value={String(item)}>
                  {item} Tahun
                </option>
              ))}
            </Select>
            <Select value={statusSiswa} onChange={(e) => setStatusSiswa(e.target.value)}>
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof StudentRecord)}>
                <option value="namaSiswa">Urut Nama</option>
                <option value="nis">Urut NIS</option>
                <option value="nisn">Urut NISN</option>
                <option value="kelas">Urut Kelas</option>
                <option value="usia">Urut Usia</option>
              </Select>
              <Button variant="secondary" onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}>
                {sortDir === "asc" ? "A-Z" : "Z-A"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">Total tersimpan: {students.length} siswa</Badge>
              <Badge>Total ditampilkan: {filtered.length} siswa</Badge>
              <Badge className="bg-sky-100 text-sky-700">Halaman {currentPage}</Badge>
            </div>
            <Button variant="secondary" onClick={() => { setQuery(""); setKelas(""); setRombel(""); setJenisKelamin(""); setUsia(""); setStatusSiswa(""); setPage(1); }}>Reset Filter — Tampilkan Semua</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  {[
                    "No",
                    "NIS",
                    "NISN",
                    "Nama Siswa",
                    "Jenis Kelamin",
                    "Tempat Lahir",
                    "Tanggal Lahir",
                    "Usia",
                    "Kelas",
                    "Rombel",
                    "Alamat",
                    "Orang Tua/Wali",
                    "Status",
                    "Aksi",
                  ].map((head) => (
                    <th key={head} className="px-3 py-3 font-semibold whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((student, index) => (
                    <tr key={student.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="px-3 py-3">{student.nis}</td>
                      <td className="px-3 py-3">{student.nisn}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{student.namaSiswa}</td>
                      <td className="px-3 py-3">{student.jenisKelamin}</td>
                      <td className="px-3 py-3">{student.tempatLahir}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{formatDateIndonesia(student.tanggalLahir)}</td>
                      <td className="px-3 py-3">{student.usia}</td>
                      <td className="px-3 py-3">{student.kelas}</td>
                      <td className="px-3 py-3">{student.rombel}</td>
                      <td className="px-3 py-3 min-w-56">{student.alamat}</td>
                      <td className="px-3 py-3">{student.namaOrangTua}</td>
                      <td className="px-3 py-3">{student.statusSiswa}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditing(student)}>
                            Edit
                          </Button>
                          <Button variant="danger" disabled={pending} onClick={() => handleDelete(student.id)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="px-3 py-10 text-center text-slate-500">
                      Belum ada data siswa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Menampilkan {paged.length} data per halaman.</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Sebelumnya
              </Button>
              <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {editing ? <StudentFormModal student={editing} onDone={() => setEditing(null)} /> : null}
    </div>
  );
}
