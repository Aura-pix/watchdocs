/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: "#090d16",
          canvas: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          muted: "#8b949e",
          text: "#c9d1d9",
          green: "#238636",
          greenHover: "#2ea043",
          greenBadge: "#22c55e",
          diffAdd: "#04260f",
          diffAddText: "#7ee787",
          diffDel: "#490202",
          diffDelText: "#ff7b72",
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
