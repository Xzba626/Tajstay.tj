import Link from "next/link";
import type { ReactNode } from "react";
import { Cluster } from "@/components/ds/Cluster";
import { Stack } from "@/components/ds/Stack";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function NotificationsPageHeader({ backHref, backLabel, title, subtitle, actions }: Props) {
  return (
    <Cluster justify="between" align="center" gap="md">
      <Stack gap="xs">
        <Link href={backHref} className="taj-notifications-back">
          ← {backLabel}
        </Link>
        <h1 className="taj-notifications-title">{title}</h1>
        <p className="taj-notifications-subtitle">{subtitle}</p>
      </Stack>
      {actions}
    </Cluster>
  );
}
