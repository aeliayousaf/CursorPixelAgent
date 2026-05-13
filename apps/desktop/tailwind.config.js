/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,tsx,ts}", "./src/components/**/*.{tsx,ts}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
      },
      colors: {
        bubble: {
          DEFAULT: "#fff8e7",
          border: "#2d1b4e",
        },
        pet: {
          body: "#5b8cff",
          accent: "#ffd166",
          eye: "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
};
