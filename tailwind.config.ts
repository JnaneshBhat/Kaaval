import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: { 950: "#060914", 900: "#0a0f1f", 800: "#101830", 700: "#1a2444" } },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] },
      keyframes: { floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } }, pop: { "0%": { opacity: "0", transform: "translateY(8px) scale(.98)" }, "100%": { opacity: "1", transform: "none" } } },
      animation: { floaty: "floaty 4s ease-in-out infinite", pop: "pop .35s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
