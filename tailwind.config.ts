import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#0B1220",
        deep: "#111B30",
        glow: "#4FC3F7",
      },
      fontFamily: {
        sans: ["Prompt", "Noto Sans Thai", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
