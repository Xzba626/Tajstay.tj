"use client";

import { useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { cn } from "@/lib/cn";
import { isBrandAssetUrl } from "@/lib/brand";

type Props = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

function avatarInitial(name: string): string {
  const first = name.trim().split(/\s+/).filter(Boolean)[0];
  return (first?.[0] ?? "T").toUpperCase();
}

const SIZE_PX = { sm: 36, md: 56, lg: 64, xl: 88 } as const;

export function ProfileAvatar({ name, imageUrl, size = "lg", className }: Props) {
  const px = SIZE_PX[size];
  const trimmed = imageUrl?.trim() && !isBrandAssetUrl(imageUrl) ? imageUrl.trim() : null;
  const fontSize = size === "sm" ? "0.875rem" : size === "xl" ? "1.75rem" : undefined;
  // SECURITY CORRECTION BLOCK, Section 7: `trimmed` already covers null/empty/brand-placeholder,
  // but a genuinely broken remote URL (404, CORS, expired/private Telegram photo link) was still
  // reaching next/image with no onError handler, so the browser's native broken-image icon showed
  // through — exactly the defect reported from the header + Personal Data screenshots. `failed`
  // tracks a real runtime load failure and forces the same initials fallback used for the
  // null/empty cases, so every failure mode (missing data vs. bad live URL) converges on one
  // control, not two different-looking outcomes.
  const [failed, setFailed] = useState(false);
  const src = failed ? null : trimmed;

  if (src) {
    return (
      <div
        className={cn("profile-avatar profile-avatar--photo shrink-0 overflow-hidden", className)}
        style={{ width: px, height: px }}
      >
        <AppImage
          src={src}
          alt={name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("profile-avatar profile-avatar--initial shrink-0", className)}
      style={{ width: px, height: px, fontSize }}
    >
      {avatarInitial(name)}
    </div>
  );
}
