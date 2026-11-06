import Image from "next/image";
import { getGovernmentHeading, getSchoolLogos, SCHOOL_LETTERHEAD_CSS } from "@/lib/branding";
import type { SchoolSettingsRecord } from "@/lib/types";

export function SchoolLetterhead({ settings }: { settings: SchoolSettingsRecord }) {
  const logos = getSchoolLogos(settings);
  const region = [settings.desaKelurahan, settings.kecamatan, settings.kabupaten, settings.provinsi].filter(Boolean).join(" · ");

  return (
    <>
      <style>{SCHOOL_LETTERHEAD_CSS}</style>
      <header className="school-letterhead">
        <div className="school-letterhead-logo">
          {logos.government ? <Image unoptimized src={logos.government} alt="Logo Kabupaten Bandung Barat" width={78} height={90} /> : null}
        </div>
        <div className="school-letterhead-copy">
          <p className="school-letterhead-government">{getGovernmentHeading(settings)}</p>
          <p className="school-letterhead-department">DINAS PENDIDIKAN</p>
          <h1 className="school-letterhead-name">{settings.namaSekolah || "REKAP SISWA"}</h1>
          <p className="school-letterhead-detail">NPSN: {settings.npsn || "-"}</p>
          {settings.alamat ? <p className="school-letterhead-detail">{settings.alamat}</p> : null}
          {region ? <p className="school-letterhead-detail">{region}</p> : null}
        </div>
        <div className="school-letterhead-logo">
          {logos.school ? <Image unoptimized src={logos.school} alt={`Logo ${settings.namaSekolah || "Sekolah"}`} width={78} height={90} /> : null}
        </div>
      </header>
    </>
  );
}
