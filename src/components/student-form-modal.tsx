"use client";

import { useEffect, useState, useTransition } from "react";
import { saveStudentAction } from "@/app/actions";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { CLASS_OPTIONS, GENDER_OPTIONS, ROMBEL_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import type { StudentRecord } from "@/lib/types";

const emptyForm = {
  nis: "",
  nisn: "",
  namaSiswa: "",
  jenisKelamin: "Laki-laki",
  tempatLahir: "",
  tanggalLahir: "",
  kelas: "1",
  rombel: "A",
  alamat: "",
  namaOrangTua: "",
  statusSiswa: "Aktif",
};

export function StudentFormModal({ student, onDone }: { student?: StudentRecord | null; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (student) {
      setForm({
        nis: student.nis,
        nisn: student.nisn,
        namaSiswa: student.namaSiswa,
        jenisKelamin: student.jenisKelamin,
        tempatLahir: student.tempatLahir,
        tanggalLahir: student.tanggalLahir,
        kelas: student.kelas,
        rombel: ROMBEL_OPTIONS.includes(student.rombel.trim().toUpperCase() as (typeof ROMBEL_OPTIONS)[number])
          ? student.rombel.trim().toUpperCase()
          : "A",
        alamat: student.alamat,
        namaOrangTua: student.namaOrangTua,
        statusSiswa: student.statusSiswa,
      });
      setOpen(true);
    }
  }, [student]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await saveStudentAction(form, student?.id);
      setMessage(result.message);
      if (result.success) {
        setOpen(false);
        setForm(emptyForm);
        onDone?.();
      }
    });
  }

  return (
    <>
      {!student ? (
        <Button onClick={() => setOpen(true)}>+ Tambah Data Siswa</Button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">{student ? "Edit Data Siswa" : "Tambah Data Siswa"}</h3>
                <p className="text-sm text-slate-500">Lengkapi data siswa dengan benar.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Tutup
              </Button>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Input placeholder="NIS" value={form.nis} onChange={(e) => updateField("nis", e.target.value)} />
              <Input placeholder="NISN" value={form.nisn} onChange={(e) => updateField("nisn", e.target.value)} />
              <Input className="md:col-span-2" placeholder="Nama Siswa" value={form.namaSiswa} onChange={(e) => updateField("namaSiswa", e.target.value)} />
              <Select value={form.jenisKelamin} onChange={(e) => updateField("jenisKelamin", e.target.value)}>
                {GENDER_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Input placeholder="Tempat Lahir" value={form.tempatLahir} onChange={(e) => updateField("tempatLahir", e.target.value)} />
              <Input type="date" value={form.tanggalLahir} onChange={(e) => updateField("tanggalLahir", e.target.value)} />
              <Select value={form.kelas} onChange={(e) => updateField("kelas", e.target.value)}>
                {CLASS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    Kelas {item}
                  </option>
                ))}
              </Select>
              <Select value={form.rombel} onChange={(e) => updateField("rombel", e.target.value)}>
                {ROMBEL_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    Rombel {item}
                  </option>
                ))}
              </Select>
              <Input className="md:col-span-2" placeholder="Nama Orang Tua / Wali" value={form.namaOrangTua} onChange={(e) => updateField("namaOrangTua", e.target.value)} />
              <Select value={form.statusSiswa} onChange={(e) => updateField("statusSiswa", e.target.value)}>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <div />
              <Textarea className="md:col-span-2" rows={4} placeholder="Alamat" value={form.alamat} onChange={(e) => updateField("alamat", e.target.value)} />

              {message ? <p className="md:col-span-2 text-sm text-slate-600">{message}</p> : null}

              <div className="md:col-span-2 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan Data"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
