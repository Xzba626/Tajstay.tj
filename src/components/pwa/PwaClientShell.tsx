"use client";

import { NotificationPollerProvider } from "@/components/pwa/NotificationPollerProvider";
import { PwaInstallPrompt, type PwaInstallLabels } from "@/components/pwa/PwaInstallPrompt";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { PwaPushPrompt, type PwaPushLabels } from "@/components/pwa/PwaPushPrompt";
import { PushSubscriptionSync } from "@/components/pwa/PushSubscriptionSync";
import { ChatAlertsProvider } from "@/components/pwa/ChatAlertsProvider";
import { AuthStateSync } from "@/components/auth/AuthStateSync";
import { DeviceSessionReporter } from "@/components/analytics/DeviceSessionReporter";

export function PwaClientShell({
  isAuthed,
  userId,
  initialUnreadCount,
  toastLabel,
  installLabels,
  pushLabels
}: {
  isAuthed: boolean;
  userId: number | null;
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
          <DeviceSessionReporter />
          <PushSubscriptionSync />
          <ChatAlertsProvider userId={userId} />
          <NotificationPollerProvider enabled initialUnreadCount={initialUnreadCount} toastLabel={toastLabel} />
        </>
      ) : null}
      <PwaInstallPrompt labels={installLabels} />
      {isAuthed ? <PwaPushPrompt labels={pushLabels} enabled /> : null}
    </>
  );
}
