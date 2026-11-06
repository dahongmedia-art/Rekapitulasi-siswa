import type jsPDF from "jspdf";
import { getGovernmentHeading, getSchoolLogos } from "@/lib/branding";
import type { SchoolSettingsRecord } from "@/lib/types";

type PdfLogo = { data: string; width: number; height: number };

async function loadLogo(src: string): Promise<PdfLogo | null> {
  if (!src) return null;
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const timer = window.setTimeout(() => reject(new Error("Logo belum dapat dimuat. Coba kembali setelah koneksi stabil.")), 10_000);
    image.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Browser belum mendukung pembuatan logo PDF.");
        context.drawImage(image, 0, 0);
        resolve({ data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
      } catch {
        reject(new Error("Logo tidak dapat dimasukkan ke PDF."));
      }
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Logo tidak dapat dimuat. Periksa pengaturan logo sekolah."));
    };
    image.src = src;
  });
}

export async function addSchoolLetterheadToPdf(doc: jsPDF, settings: SchoolSettingsRecord) {
  const logos = getSchoolLogos(settings);
  const [government, school] = await Promise.all([loadLogo(logos.government), loadLogo(logos.school)]);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const logoBox = 25;
  const center = pageWidth / 2;

  function addLogo(image: PdfLogo | null, left: number) {
    if (!image) return;
    const ratio = Math.min(logoBox / image.width, logoBox / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    doc.addImage(image.data, "PNG", left + (logoBox - width) / 2, 11 + (logoBox - height) / 2, width, height);
  }

  addLogo(government, margin);
  addLogo(school, pageWidth - margin - logoBox);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(getGovernmentHeading(settings), center, 15, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DINAS PENDIDIKAN", center, 21, { align: "center" });
  doc.setFontSize(16);
  const nameLines: string[] = doc.splitTextToSize((settings.namaSekolah || "REKAP SISWA").toUpperCase(), pageWidth - 100);
  doc.text(nameLines, center, 29, { align: "center" });
  let nextY = 30 + nameLines.length * 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`NPSN: ${settings.npsn || "-"}`, center, nextY, { align: "center" });
  nextY += 5;
  const address = [settings.alamat, settings.kecamatan, settings.kabupaten].filter(Boolean).join(", ");
  if (address) {
    const lines: string[] = doc.splitTextToSize(address, pageWidth - 100);
    doc.text(lines, center, nextY, { align: "center" });
    nextY += lines.length * 4;
  }
  const lineY = Math.max(43, nextY + 2);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, lineY, pageWidth - margin, lineY);
  doc.setLineWidth(0.2);
  doc.line(margin, lineY + 1, pageWidth - margin, lineY + 1);
  return lineY + 9;
}
