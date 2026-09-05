import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "var(--font-thai)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        ink: "#0f1e35",
        paper: "#f1f5fb",
        muted: "#64748b",
        border: "#dfe7f2",
        accent: "#2563eb",
        // PSU brand — น้ำเงิน / คราม / ฟ้า (homepage)
        psu: {
          navy: "#0a2b5e",
          navy800: "#0f3a7a",
          indigo: "#1b3f8f",
          blue: "#2563eb",
          blue700: "#1d4ed8",
          sky: "#eef4ff",
          sky200: "#cfe0ff",
        },
        hp: {
          subtle: "#f7f9fc",
          border: "#e3e8f0",
          borderStr: "#cdd6e3",
          ink: "#0f1e35",
          ink2: "#3b4a61",
          muted: "#6b7a90",
        },
      },
    },
  },
  plugins: [],
};
export default config;
