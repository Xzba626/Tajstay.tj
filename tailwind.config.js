/** @type {import('tailwindcss').Config} */
const path = require("path");

module.exports = {
  content: [path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"]
      },
      colors: {
        brand: {
          50: "#e6f2ec",
          100: "#c5e4d4",
          200: "#9bcfb3",
          300: "#6bb58c",
          400: "#3d9470",
          500: "#0f6b4c",
          600: "#0a4d37",
          700: "#083928",
          800: "#062b1e",
          900: "#041c14"
        }
      },
      boxShadow: {
        glow: "none",
        glass: "0 12px 32px rgba(15, 26, 20, 0.1)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
        taj: "var(--taj-radius-xl)",
        "taj-card": "var(--taj-radius-card-lg)"
      },
      maxWidth: {
        taj: "var(--taj-page-max)",
        "taj-narrow": "var(--taj-page-max-narrow)",
        "taj-dashboard": "var(--taj-dashboard-max)"
      },
      spacing: {
        "taj-page": "var(--taj-page-px)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0f6b4c 0%, #0a4d37 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(15,107,76,0.12) 0%, rgba(10,77,55,0.06) 100%)"
      }
    }
  },
  plugins: []
};
