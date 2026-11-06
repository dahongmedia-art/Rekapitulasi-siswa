import type { SchoolSettingsRecord } from "@/lib/types";

export const DEFAULT_GOVERNMENT_LOGO = "/images/logo-bandung-barat.png";
export const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_STORED_LOGO_BYTES = 512 * 1024;

export function isSafeLogoSource(value: string) {
  return value === "" || value === DEFAULT_GOVERNMENT_LOGO || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value);
}

export function getSchoolLogos(settings: SchoolSettingsRecord) {
  const government = settings.logoPemerintah ?? DEFAULT_GOVERNMENT_LOGO;
  const school = settings.logoSekolah ?? "";
  return {
    government: isSafeLogoSource(government) ? government : DEFAULT_GOVERNMENT_LOGO,
    school: isSafeLogoSource(school) ? school : "",
  };
}

export function getGovernmentHeading(settings: SchoolSettingsRecord) {
  const kabupaten = settings.kabupaten.trim() || "Kabupaten Bandung Barat";
  const region = kabupaten.replace(/^kab\.?\s+/i, "Kabupaten ");
  return `PEMERINTAH ${region}`.toUpperCase();
}

export function escapeReportHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const SCHOOL_LETTERHEAD_CSS = `
.school-letterhead { display: grid; grid-template-columns: 82px minmax(0, 1fr) 82px; gap: 18px; align-items: center; text-align: center; border-bottom: 3px double #0f172a; padding: 0 0 14px; color: #0f172a; break-inside: avoid; }
.school-letterhead-logo { display: flex; align-items: center; justify-content: center; height: 94px; }
.school-letterhead-logo img { width: 78px; height: 90px; object-fit: contain; display: block; }
.school-letterhead-copy p { margin: 2px 0; line-height: 1.4; }
.school-letterhead-government { font-size: 13px; font-weight: 600; letter-spacing: .35px; }
.school-letterhead-department { font-size: 15px; font-weight: 700; letter-spacing: 1px; }
.school-letterhead-name { font-size: 22px; line-height: 1.25; font-weight: 800; text-transform: uppercase; margin: 5px 0; }
.school-letterhead-detail { font-size: 11px; }
@media screen and (max-width: 640px) {
  .school-letterhead { grid-template-columns: 48px minmax(0, 1fr) 48px; gap: 8px; }
  .school-letterhead-logo { height: 66px; }
  .school-letterhead-logo img { width: 46px; height: 62px; }
  .school-letterhead-government { font-size: 9px; }
  .school-letterhead-department { font-size: 11px; }
  .school-letterhead-name { font-size: 16px; }
  .school-letterhead-detail { font-size: 9px; }
}
@media print {
  .school-letterhead { grid-template-columns: 24mm minmax(0, 1fr) 24mm; gap: 5mm; padding-bottom: 4mm; }
  .school-letterhead-logo { height: 27mm; }
  .school-letterhead-logo img { width: 23mm; height: 26mm; }
  .school-letterhead-government { font-size: 10pt; }
  .school-letterhead-department { font-size: 12pt; }
  .school-letterhead-name { font-size: 16pt; }
  .school-letterhead-detail { font-size: 9pt; }
}
`;

export function buildSchoolLetterheadHtml(settings: SchoolSettingsRecord) {
  const logos = getSchoolLogos(settings);
  const region = [settings.desaKelurahan, settings.kecamatan, settings.kabupaten, settings.provinsi].filter(Boolean).join(" · ");
  const logo = (src: string, alt: string) => src ? `<img src="${escapeReportHtml(src)}" alt="${escapeReportHtml(alt)}" width="78" height="90" />` : "";

  return `<header class="school-letterhead">
    <div class="school-letterhead-logo">${logo(logos.government, "Logo Kabupaten Bandung Barat")}</div>
    <div class="school-letterhead-copy">
      <p class="school-letterhead-government">${escapeReportHtml(getGovernmentHeading(settings))}</p>
      <p class="school-letterhead-department">DINAS PENDIDIKAN</p>
      <h1 class="school-letterhead-name">${escapeReportHtml(settings.namaSekolah || "REKAP SISWA")}</h1>
      <p class="school-letterhead-detail">NPSN: ${escapeReportHtml(settings.npsn || "-")}</p>
      ${settings.alamat ? `<p class="school-letterhead-detail">${escapeReportHtml(settings.alamat)}</p>` : ""}
      ${region ? `<p class="school-letterhead-detail">${escapeReportHtml(region)}</p>` : ""}
    </div>
    <div class="school-letterhead-logo">${logo(logos.school, `Logo ${settings.namaSekolah || "Sekolah"}`)}</div>
  </header>`;
}

export async function waitForReportImages(root: Document | HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
}
