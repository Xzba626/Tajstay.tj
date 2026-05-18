const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"]
      },
      colors: {
        brand: {
          50: "#e8f1ee",
          100: "#cfdfd9",
          200: "#b5c9c3",
          300: "#8fb0a6",
          400: "#6f8f86",
          500: "#145c43",
          600: "#0f4b37",
          700: "#0f3d2e",
          800: "#0f2d24",
          900: "#0b0f0e"
        }
      },
      boxShadow: {
        glow: "0 12px 36px rgba(0, 255, 150, 0.15)",
        glass: "0 12px 36px rgba(0, 0, 0, 0.35)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #145c43 0%, #0f3d2e 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(20,92,67,0.26) 0%, rgba(15,61,46,0.18) 100%)"
      }
    }
  },
  plugins: []
};
