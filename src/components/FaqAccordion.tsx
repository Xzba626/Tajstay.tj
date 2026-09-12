"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-6 space-y-2">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={index} className="faq-accordion-item">
            <button
              type="button"
              className="faq-accordion-item__trigger"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span>{item.q}</span>
              <ChevronDown size={18} className={cn("faq-accordion-item__chevron", open && "is-open")} aria-hidden />
            </button>
            {open && <p className="faq-accordion-item__answer">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
