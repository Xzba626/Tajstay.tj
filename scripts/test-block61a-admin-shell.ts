/**
 * BLOCK ADMIN 6.1A closure — targeted shell tests, following this project's existing pattern
 * (plain `tsx` script + pure-function/SSR-render assertions, no new test framework added; see
 * scripts/test-block56d-static.ts for precedent).
 *
 * What CAN be verified this way (no live DOM/browser required):
 *   A. active-nav / section-href determination — pure function, direct call.
 *   B. AdminBackButton — real component, static-rendered, contract asserted on the HTML output.
 *   C. mobile drawer + primary-tab + sidebar section inventory vs the page's VALID_SECTIONS list
 *      (this exact class of bug — a section unreachable on mobile — already happened once; see
 *      AdminSidebar.tsx's own "bookings" comment).
 *   D. Admin route shell classification (shellFor) — pure function, direct call.
 *   E. AdminConfirmDialog static contract — real component, static-rendered for open/closed
 *      states: correct ARIA attributes present, Cancel rendered before Confirm in DOM order
 *      (matters for the default Tab order), closed state renders nothing.
 *
 * What CANNOT be verified this way, and is NOT claimed as PASS here:
 *   - Real keyboard focus movement (Tab/Shift+Tab wrap, Escape, focus restoration) requires a
 *     live DOM with real focus semantics — `renderToStaticMarkup` runs no effects and there is no
 *     `document`. That behavior was runtime-verified instead in the Browser pane (see the ADMIN
 *     6.1A report's Accessibility section) — this script verifies only the static HTML contract
 *     the runtime behavior depends on (roles/attributes/button order existing at all).
 *   - Double-submit prevention for AdminConfirmDialog's `busy` prop is asserted here only as a
 *     static contract (disabled attribute present when busy=true); the previous 6.1 pass wired
 *     this dialog to logout only, which has no submission counter to assert against at runtime.
 *
 * Run: TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block61a-admin-shell.ts
 *   (Windows PowerShell: $env:TSX_TSCONFIG_PATH="tsconfig.scripts.json"; npx tsx scripts/test-block61a-admin-shell.ts)
 * The env override is needed only because this repo's root tsconfig.json sets `"jsx": "preserve"`
 * (correct for Next's own build, which does its own JSX transform) — plain `tsx` needs a real
 * transform to execute JSX outside of Next, so tsconfig.scripts.json (repo root, jsx: "react-jsx")
 * is used for this script only. No production file or the root tsconfig were changed for this.
 */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { shellFor } from "../src/middleware";
import {
  sectionHref,
  buildItems,
  SIDEBAR_GROUPS,
  DRAWER_GROUP_SECTIONS,
  MOBILE_PRIMARY,
  type AdminSidebarLabels
} from "../src/components/dashboard/AdminSidebar";
import { AdminBackButton } from "../src/components/admin/AdminBackButton";
import { AdminConfirmDialog } from "../src/components/admin/AdminConfirmDialog";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${label}`);
  }
}

// ---- D. Admin route shell classification (middleware.shellFor) ----
check("shellFor: /dashboard/admin -> admin", shellFor("/dashboard/admin") === "admin");
check("shellFor: /dashboard/admin/chat-archive -> admin (nested route)", shellFor("/dashboard/admin/chat-archive") === "admin");
check("shellFor: /dashboard/owner -> owner", shellFor("/dashboard/owner") === "owner");
check("shellFor: / -> consumer (public shell renders)", shellFor("/") === "consumer");
check("shellFor: /search -> consumer", shellFor("/search") === "consumer");
check("shellFor: /dashboardadmin -> consumer (prefix false-match guard)", shellFor("/dashboardadmin") === "consumer");

// ---- A. active-nav / section-href determination ----
check(
  "sectionHref: builds ?section= on the current pathname",
  sectionHref("/dashboard/admin", "users") === "/dashboard/admin?section=users"
);
check(
  "sectionHref: works for any pathname passed (nested routes too)",
  sectionHref("/dashboard/admin/chat-archive", "dashboard") === "/dashboard/admin/chat-archive?section=dashboard"
);

// ---- C. mobile drawer / primary-tab / sidebar inventory vs VALID_SECTIONS ----
// Kept as a literal list (not imported from page.tsx, which pulls in Prisma/server-only imports
// at module scope) — if this list and page.tsx's VALID_SECTIONS in
// src/app/dashboard/admin/page.tsx ever diverge, update both together.
const VALID_SECTIONS = [
  "dashboard",
  "content",
  "applications",
  "hotels",
  "users",
  "owner-access",
  "bookings",
  "finance",
  "notifications",
  "complaints"
] as const;

const fakeLabels: AdminSidebarLabels = {
  sectionTitle: "x",
  navLabel: "x",
  mobileNav: "x",
  navHint: "x",
  mobileMore: "x",
  drawerGroups: { hotels: "x", platform: "x", finance: "x", operations: "x", access: "x" },
  sidebarGroups: { overview: "x", people: "x", hotelOps: "x", platform: "x", finance: "x", operations: "x" },
  items: {
    dashboard: "x",
    content: "x",
    applications: "x",
    hotels: "x",
    users: "x",
    ownerAccess: "x",
    bookings: "x",
    finance: "x",
    complaints: "x",
    notifications: "x"
  }
};

const items = buildItems(fakeLabels);
const itemSections = items.map((i) => i.section).sort();
check(
  "buildItems: every VALID_SECTIONS entry has a sidebar item (no orphan section)",
  [...VALID_SECTIONS].sort().every((s) => itemSections.includes(s)) && itemSections.length === VALID_SECTIONS.length
);

const sidebarCoveredSections = SIDEBAR_GROUPS.flatMap((g) => g.sections);
check(
  "SIDEBAR_GROUPS: every buildItems section appears somewhere in the desktop sidebar",
  itemSections.every((s) => sidebarCoveredSections.includes(s))
);

// Every non-primary-mobile section must appear in the drawer, or it is silently unreachable on
// mobile — the exact bug class the "bookings" comment in AdminSidebar.tsx documents.
const drawerCoveredSections = DRAWER_GROUP_SECTIONS.flatMap((g) => g.sections);
const nonPrimarySections = itemSections.filter((s) => !(MOBILE_PRIMARY as readonly string[]).includes(s));
const uncoveredOnMobile = nonPrimarySections.filter((s) => !drawerCoveredSections.includes(s));
check(
  `mobile reachability: every non-primary section is in the "Ещё" drawer (uncovered: ${uncoveredOnMobile.join(", ") || "none"})`,
  uncoveredOnMobile.length === 0
);

// ---- B. AdminBackButton — real component, static-rendered ----
const backHtml = renderToStaticMarkup(React.createElement(AdminBackButton, { href: "/dashboard/bookings", label: "Назад" }));
check("AdminBackButton: renders an anchor to the given href", backHtml.includes('href="/dashboard/bookings"'));
check("AdminBackButton: renders the given label text", backHtml.includes(">Назад<") || backHtml.includes(">Назад</span>"));
check("AdminBackButton: renders an svg chevron icon, not a bare text arrow", backHtml.includes("<svg"));
check("AdminBackButton: no literal bare arrow character used as the whole control", !backHtml.trim().startsWith("←"));

// ---- E. AdminConfirmDialog — static contract for open/closed states ----
const closedHtml = renderToStaticMarkup(
  React.createElement(AdminConfirmDialog, {
    open: false,
    title: "T",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    onConfirm: () => {},
    onCancel: () => {}
  })
);
check("AdminConfirmDialog: closed state renders nothing", closedHtml === "");

const openHtml = renderToStaticMarkup(
  React.createElement(AdminConfirmDialog, {
    open: true,
    title: "Выйти из аккаунта?",
    description: "Вы завершите текущую сессию.",
    confirmLabel: "Выйти",
    cancelLabel: "Отмена",
    variant: "destructive",
    onConfirm: () => {},
    onCancel: () => {}
  })
);
check('AdminConfirmDialog: open state has role="dialog"', openHtml.includes('role="dialog"'));
check('AdminConfirmDialog: open state has aria-modal="true"', openHtml.includes('aria-modal="true"'));
check("AdminConfirmDialog: open state has aria-labelledby wired to the title", /aria-labelledby="[^"]+"/.test(openHtml));
check("AdminConfirmDialog: open state has aria-describedby wired to the description", /aria-describedby="[^"]+"/.test(openHtml));
check("AdminConfirmDialog: title text present", openHtml.includes("Выйти из аккаунта?"));
check("AdminConfirmDialog: description text present", openHtml.includes("Вы завершите текущую сессию."));
check(
  "AdminConfirmDialog: Cancel button appears before Confirm button in DOM order (default Tab order)",
  openHtml.indexOf("Отмена") < openHtml.indexOf(">Выйти<")
);

const busyHtml = renderToStaticMarkup(
  React.createElement(AdminConfirmDialog, {
    open: true,
    title: "T",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    busy: true,
    onConfirm: () => {},
    onCancel: () => {}
  })
);
check("AdminConfirmDialog: busy=true disables the Confirm button (double-submit guard, static contract)", (busyHtml.match(/disabled=""/g) ?? []).length >= 2);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log(
    "\nNOT covered by this script (requires a live DOM — runtime-verified separately, see the report):" +
      "\n  - real Tab/Shift+Tab focus trapping" +
      "\n  - Escape-to-cancel keydown handling" +
      "\n  - focus restoration to the trigger element on close" +
      "\n  - initial-focus placement (Cancel for destructive, Confirm otherwise)"
  );
}
process.exit(fail > 0 ? 1 : 0);
