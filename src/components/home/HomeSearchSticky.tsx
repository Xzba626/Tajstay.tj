"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  targetId?: string;
};

export function HomeSearchSticky({ label, targetId = "home-search" }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHidden(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0, 0.15, 0.5] }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div className={cnSticky(hidden)} aria-hidden={hidden}>
      <a href={`#${targetId}`} className="taj-btn taj-btn--primary taj-btn--lg taj-btn--full shadow-lg">
        {label}
      </a>
    </div>
  );
}

function cnSticky(hidden: boolean) {
  return ["home-search-sticky", hidden ? "is-hidden" : ""].filter(Boolean).join(" ");
}
