import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#070707",
        panel: "#101112",
        steel: "#a8adb4",
        ember: "#d45b38",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
        display: ["var(--font-oswald)", "Arial Narrow", "sans-serif"],
      },
      boxShadow: {
        metal: "inset 0 1px 0 rgba(255,255,255,.06), 0 20px 60px rgba(0,0,0,.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
