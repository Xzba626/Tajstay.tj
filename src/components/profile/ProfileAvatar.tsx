import { AppImage } from "@/components/ui/AppImage";
import { cn } from "@/lib/cn";

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
  const src = imageUrl?.trim() || null;
  const fontSize = size === "sm" ? "0.875rem" : size === "xl" ? "1.75rem" : undefined;

  if (src) {
    return (
      <div
        className={cn("profile-avatar profile-avatar--photo shrink-0 overflow-hidden", className)}
        style={{ width: px, height: px }}
      >
        <AppImage src={src} alt={name} width={px} height={px} className="h-full w-full object-cover" />
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
