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
          50: "var(--color-brand-soft)",
          100: "#d8f1e2",
          200: "#86c9a0",
          300: "#4ade80",
          400: "#22c55e",
          500: "var(--color-brand)",
          600: "var(--color-brand-hover)",
          700: "var(--color-brand-active)",
          800: "#012f1a",
          900: "#012f1a"
        },
        page: "var(--color-page)",
        surface: {
          DEFAULT: "var(--color-surface)",
          subtle: "var(--color-surface-subtle)",
          elevated: "var(--color-surface-elevated)",
          brand: "var(--color-brand)"
        },
        ink: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          onBrand: "var(--color-text-on-brand)"
        },
        semantic: {
          success: "var(--color-success)",
          "success-soft": "var(--color-success-soft)",
          warning: "var(--color-warning)",
          "warning-soft": "var(--color-warning-soft)",
          danger: "var(--color-danger)",
          "danger-soft": "var(--color-danger-soft)",
          info: "var(--color-info)",
          "info-soft": "var(--color-info-soft)",
          gold: "var(--color-gold)",
          "gold-soft": "var(--color-gold-soft)"
        }
      },
      boxShadow: {
        glow: "0 12px 36px rgba(0, 255, 150, 0.15)",
        glass: "0 12px 36px rgba(0, 0, 0, 0.35)"
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
        "brand-gradient": "linear-gradient(135deg, #006B38 0%, #004724 45%, #012F1A 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(0,107,56,0.26) 0%, rgba(0,71,36,0.18) 100%)"
      }
    }
  },
  plugins: []
};
