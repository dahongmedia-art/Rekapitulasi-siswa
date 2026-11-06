import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "REKAP SISWA",
  description: "Aplikasi administrasi sekolah untuk mengelola dan merekap data siswa secara mudah, cepat, dan rapi.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
