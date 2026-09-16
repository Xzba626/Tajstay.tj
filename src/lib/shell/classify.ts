/**
 * Pure Admin/Owner/Consumer route classification — used by BOTH `middleware.ts` (server-side,
 * decides what `RootLayout` renders for the initial/hard-navigation request) and
 * `ShellBoundaryGuard.tsx` (client-side, re-checks on every soft navigation). Kept dependency-free
 * so it can be imported from an edge-runtime module and a "use client" component without pulling
 * in `next/server` or any React code.
 */
export type ShellKind = "admin" | "owner" | "manager" | "consumer";

function isSegmentPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function shellFor(path: string): ShellKind {
  if (isSegmentPrefix(path, "/dashboard/admin")) return "admin";
  if (isSegmentPrefix(path, "/dashboard/owner")) return "owner";
  if (isSegmentPrefix(path, "/dashboard/manager")) return "manager";
  return "consumer";
}
