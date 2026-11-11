/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0",
        surface: "#FFFFFF",
        ink: "#161614",
        muted: "#6B6A63",
        line: "#E4E1D8",
        code: "#F2EFE8",
        success: {
          DEFAULT: "#1F7A3D",
          soft: "#E6F4EA",
        },
        danger: {
          DEFAULT: "#B42318",
          soft: "#FEECEB",
        },
      },
      fontFamily: {
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
