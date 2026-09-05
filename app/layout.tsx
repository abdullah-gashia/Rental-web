import { getTr } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Sarabun } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ui/Toast";
import AuthInitializer from "@/components/auth/AuthInitializer";
import { getLocale, getTheme } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

// DM Sans has no Thai. Without a Thai face the whole site falls back to
// whatever the OS picks, which is why Thai text rendered inconsistently
// between machines.
const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-thai",
});

export async function generateMetadata() {
  const tr = await getTr();
  return {
  title: tr("PSU Store — University Marketplace"),
  description: tr("ตลาดซื้อขายสินค้าของนักศึกษา PSU ปลอดภัย ง่าย ไว"),
  icons: { icon: "/brand/psu-store-logo.png" },
};
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);

  return (
    <html
      lang={locale}
      // "system" deliberately stamps nothing, so prefers-color-scheme decides.
      {...(theme === "system" ? {} : { "data-theme": theme })}
      className={`${dmSans.variable} ${dmMono.variable} ${sarabun.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        {/* The locale the server just read, handed to the client components so
            both renders agree and there is no hydration mismatch. */}
        <LocaleProvider locale={locale}>
          <AuthInitializer />
          {children}
          <ToastContainer />
        </LocaleProvider>
      </body>
    </html>
  );
}
