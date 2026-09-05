"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";

/**
 * Chrome around a single borrow.
 *
 * Split out because the order view itself is shared with the office back
 * office, which has its own sidebar and must not render the marketplace one.
 */
export default function BorrowOrderShell({ children }: { children: React.ReactNode }) {
  const tr = useTr();
  const router = useRouter();
  const go = (c: string) => router.push(c === "all" ? "/" : `/?cat=${c}`);

  return (
    <div className="bw-root">
      <Navbar
        searchQuery=""
        onSearchChange={() => {}}
        searchPlaceholder={tr("ค้นหาอุปกรณ์ให้ยืม…")}
        hideCategories
        activeCat="borrow"
        onCatChange={go}
      />
      <SideRail activeCat="borrow" onCatChange={go} />

      <div className="md:pl-[68px]">
        <main className="max-w-[980px] mx-auto px-3 sm:px-5 pt-6 pb-20">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
