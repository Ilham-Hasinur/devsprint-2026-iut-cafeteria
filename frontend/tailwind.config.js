export default {
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    container: {
      center: true,
      padding: "1rem",
    },

    extend: {
      animation: {
        pulseSlow: "pulse 3s infinite",
        blink: "blink 1.2s infinite"
      },

      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" }
        }
      }
    },
  },

  plugins: [],
}