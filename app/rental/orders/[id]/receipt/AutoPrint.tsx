"use client";

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    // Small delay so fonts/images can load before the print dialog
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
