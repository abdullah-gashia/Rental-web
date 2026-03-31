import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ui/Toast";
import AuthInitializer from "@/components/auth/AuthInitializer";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "PSU Store — University Marketplace",
  description:
    "ตลาดซื้อขายสินค้าของนักศึกษา PSU ปลอดภัย ง่าย ไว",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="font-sans">
        <AuthInitializer />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
