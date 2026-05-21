"use client";

import { NotificationPollerProvider } from "@/components/pwa/NotificationPollerProvider";
import { PwaInstallPrompt, type PwaInstallLabels } from "@/components/pwa/PwaInstallPrompt";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { PwaPushPrompt, type PwaPushLabels } from "@/components/pwa/PwaPushPrompt";
import { AuthStateSync } from "@/components/auth/AuthStateSync";

export function PwaClientShell({
  isAuthed,
  initialUnreadCount,
  toastLabel,
  installLabels,
  pushLabels
}: {
  isAuthed: boolean;
  initialUnreadCount: number;
  toastLabel: string;
  installLabels: PwaInstallLabels;
  pushLabels: PwaPushLabels;
}) {
  return (
    <>
      <PwaProvider />
      {isAuthed ? (
        <>
          <AuthStateSync />
          <NotificationPollerProvider enabled initialUnreadCount={initialUnreadCount} toastLabel={toastLabel} />
        </>
      ) : null}
      <PwaInstallPrompt labels={installLabels} />
      {isAuthed ? <PwaPushPrompt labels={pushLabels} enabled /> : null}
    </>
  );
}
