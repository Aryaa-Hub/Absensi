import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Absensi KCIC — Foto & GPS",
  description: "Aplikasi Absensi Karyawan & Magang PT KCIC Berbasis Foto Selfie, GPS Geofencing, dan Waktu Server",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <main className="container-fluid p-0 d-flex flex-column align-items-center" style={{ minHeight: "100vh" }}>
          <div className="w-100" style={{ maxWidth: "480px" }}>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
