# Local fonts (required for production)

This project must **not** depend on runtime Google Fonts requests.

## What to add

Put font files in this folder (recommended format: **.woff2**):

- `Inter-Variable.woff2` (or Inter static set)
- `DMSans-Variable.woff2` (optional)
- `PlayfairDisplay-Variable.woff2` (optional; display/hero only)

## How to wire (Next.js)

Use `next/font/local` in `src/app/layout.tsx` (or a dedicated `src/app/fonts.ts`) and export CSS variables:

- `--font-inter`
- `--font-dm`
- `--font-playfair`

Then `globals.css` already consumes them via:

- `--font-sans`
- `--font-display`

## Current status

We **removed** `next/font/google` usage so UI rendering has **zero external font network dependencies**.
To fully lock typography, add the files above and connect them via `next/font/local`.

