"use client";

import { Menu } from "lucide-react";

type Props = {
  ariaLabel: string;
  onOpen: () => void;
};

/** Floating menu trigger for owner/admin mobile panels (above bottom nav). */
export function PanelDrawerFab({ ariaLabel, onOpen }: Props) {
  return (
    <button
      type="button"
      className="panel-drawer-fab lg:hidden"
      aria-label={ariaLabel}
      onClick={onOpen}
    >
      <Menu size={22} aria-hidden />
    </button>
  );
}
