import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Indigo is the primary interactive color (links, buttons, focus).
        // Gold is used sparingly, only for the "highlight/citation" motif.
        brand: {
          50: "#EEEEF9",
          100: "#DCDDF2",
          200: "#B4B6E4",
          300: "#8B8ED5",
          400: "#5F63BC",
          500: "#3A3FA6",
          600: "#31358C",
          700: "#262B73",
          800: "#1D2159",
          900: "#151840",
        },
        gold: {
          50: "#FDF6E8",
          100: "#FBEBC9",
          400: "#EFBE5C",
          500: "#E7A93C",
          600: "#C98E27",
        },
        ink: {
          DEFAULT: "#1B1E27",
          900: "#14161D",
        },
        paper: {
          DEFAULT: "#F5F6F8",
          dim: "#ECEDF1",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
