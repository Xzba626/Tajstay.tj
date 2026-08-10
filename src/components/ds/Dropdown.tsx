"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from "react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Accessible label for the menu panel */
  label?: string;
};

/**
 * Shared floating panel: click-outside + Escape + aria-expanded.
 * Presentation only — consumers own open state and item actions.
 */
export function Dropdown({
  open,
  onOpenChange,
  trigger,
  children,
  align = "end",
  className,
  label = "Menu"
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ "aria-expanded"?: boolean; "aria-haspopup"?: string; "aria-controls"?: string }>, {
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": menuId
      })
    : trigger;

  return (
    <div ref={rootRef} className={cn("taj-dropdown-root relative inline-flex", className)}>
      {triggerNode}
      <div
        id={menuId}
        role="menu"
        aria-label={label}
        aria-hidden={!open}
        className={cn(
          "taj-dropdown-panel",
          align === "end" ? "taj-dropdown-panel--end" : "taj-dropdown-panel--start",
          open ? "taj-dropdown-panel--open" : "taj-dropdown-panel--closed"
        )}
        style={
          {
            "--taj-dropdown-z": "var(--z-dropdown)"
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
