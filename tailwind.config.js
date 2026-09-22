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
        /* Re-anchored on the canonical TajStay green #0F7A4D (2026-09-20 production screenshot:
           header/CTA painted #0f7a4d while brand-* surfaces painted a different green family —
           #006b38/#004724/#012f1a — producing the "green on green" mismatch). Every step is now
           a tint/shade of the one canonical hue, so `brand-*` utilities can no longer introduce a
           second brand green. 500 IS the canonical value; semantic success/warning/danger colors
           are deliberately NOT touched. */
        brand: {
          50: "#e8f5ee",
          /* 100/200 were still pale-mint tints left over from the pre-white-canvas era (readable
             on a dark/green surface, not on white) - confirmed used ONLY as text color, in 18
             consumer files (search/booking/chat/hotel/payment/auth/trips), zero as background or
             border, so re-anchoring these two values here fixes every one of those call sites at
             once instead of patching each label - the near-invisible "Найдено: N" / availability
             text on Search results was this, not a one-off. 300+ were already fixed in the prior
             #0F7A4D re-anchor pass and are untouched. */
          100: "#3f7256",
          200: "#2f5c44",
          300: "#5cb68b",
          400: "#2f9a6a",
          500: "#0f7a4d",
          600: "#0c6340",
          700: "#0a5134",
          800: "#073d27",
          900: "#052b1b"
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
        /* Same re-anchor as the brand scale above: was the old #006B38/#004724/#012F1A family. */
        "brand-gradient": "linear-gradient(135deg, #0F7A4D 0%, #0C6340 45%, #073D27 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(15,122,77,0.26) 0%, rgba(12,99,64,0.18) 100%)"
      }
    }
  },
  plugins: []
};
