import type { Metadata } from "next";
import { Noto_Sans_Thai, Noto_Serif_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-serif-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ปัญญา AI | Panya-AI — ฐานข้อมูลกฎหมายไทย",
  description:
    "ศูนย์ข้อมูลกฎหมายไทย — กฎหมายแรงงาน ป.พ.พ. ป.อ. และคำพิพากษาศาลฎีกา พร้อม AI ถามตอบพร้อมอ้างอิงมาตรา",
  keywords: [
    "กฎหมายไทย",
    "กฎหมายแรงงาน",
    "คำพิพากษาศาลฎีกา",
    "ประมวลกฎหมายแพ่ง",
    "ประมวลกฎหมายอาญา",
    "Thai law",
    "Labor law Thailand",
    "Supreme Court judgments",
  ],
  authors: [{ name: "Panya-AI" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Panya-AI — ฐานข้อมูลกฎหมายไทย",
    description:
      "กฎหมายแรงงาน ป.พ.พ. ป.อ. และคำพิพากษาศาลฎีกา พร้อม AI ถามตอบ",
    type: "website",
    locale: "th_TH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${notoSansThai.variable} ${notoSerifThai.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
