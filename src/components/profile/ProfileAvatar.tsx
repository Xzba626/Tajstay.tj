import { AppImage } from "@/components/ui/AppImage";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  imageUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
};

function avatarInitial(name: string): string {
  const first = name.trim().split(/\s+/).filter(Boolean)[0];
  return (first?.[0] ?? "T").toUpperCase();
}

export function ProfileAvatar({ name, imageUrl, size = "lg", className }: Props) {
  const px = size === "lg" ? 64 : 56;
  const src = imageUrl?.trim() || null;

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
      style={{ width: px, height: px }}
      aria-hidden
    >
      {avatarInitial(name)}
    </div>
  );
}
