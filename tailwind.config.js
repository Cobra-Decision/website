import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{tsx,ts}"],
  theme: {
    extend: {
      fontFamily: {
        vazir: ["Vazirmatn", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dark: {
          "color-scheme": "dark",
          "primary": "#F7C705",
          "primary-content": "#101A27",
          "secondary": "#38bdf8",
          "secondary-content": "#101A27",
          "accent": "#F7C705",
          "accent-content": "#101A27",
          "neutral": "#182436",
          "neutral-content": "#E2E8F0",
          "base-100": "#15202E",
          "base-200": "#101A27",
          "base-300": "#0B121C",
          "base-content": "#F1F5F9",
          "info": "#38bdf8",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
      },
    ],
  },
};
