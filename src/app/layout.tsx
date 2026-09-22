import type { Metadata, Viewport } from "next";
import { Anuphan, IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const body = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const display = Anuphan({ subsets: ["thai", "latin"], weight: ["500", "600", "700"], variable: "--font-display-face" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "ระบบจัดการหอพัก",
  description: "จัดการห้อง ผู้เช่า มิเตอร์ บิล และงานซ่อม",
};

export const viewport: Viewport = { themeColor: "#fafafa" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
