import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gotchi: {
          common: "#806AFB",
          uncommon: "#20C9C0",
          rare: "#59BCFF",
          legendary: "#FFC36B",
          mythical: "#FF96FF",
          godlike: "#51FFA8",
        }
      },
      fontFamily: {
        pixelar: ['Pixelar', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
