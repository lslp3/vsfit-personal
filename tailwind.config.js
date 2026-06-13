/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vs: {
          dark: "#050505",
          "dark-2": "#080808",
          card: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.10)",
          primary: "#ff2a32",
          text: "#ffffff",
          muted: "#a1a1aa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      },
    },
  },
  plugins: [],
};
