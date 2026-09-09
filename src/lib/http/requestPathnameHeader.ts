/**
 * Header name middleware.ts sets to the current request pathname, so Server Components
 * (e.g. RootLayout) can read it via `headers()` to decide which shell chrome to render —
 * without a client-side pathname hook wrapping async Server Components (that pattern broke
 * the dev server previously, see .agent/STATE.md).
 */
export const REQUEST_PATHNAME_HEADER = "x-tajstay-pathname";
