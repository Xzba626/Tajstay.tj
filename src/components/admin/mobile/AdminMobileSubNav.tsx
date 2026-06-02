"use client";

import type { AdminSubNavItem } from "@/components/admin/mobile/admin-mobile-nav";

type Props = {
  items: AdminSubNavItem[];
  activeSection: string;
  onSelect: (section: string) => void;
};

export function AdminMobileSubNav({ items, activeSection, onSelect }: Props) {
  return (
    <div className="admin-mobile-subnav lg:hidden">
      <div className="admin-mobile-subnav__scroll" role="tablist">
        {items.map((item) => {
          const active = item.section === activeSection;
          return (
            <button
              key={item.section}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-mobile-subnav__pill${active ? " is-active" : ""}`}
              onClick={() => onSelect(item.section)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
