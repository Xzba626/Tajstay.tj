export const NOTIFICATION_NEW_EVENT = "tajstay:notification-new";
export const NOTIFICATION_TOAST_EVENT = "tajstay:notification-toast";

export type NotificationNewDetail = {
  count: number;
  delta: number;
  preview?: string;
};

export function dispatchNotificationNew(detail: NotificationNewDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_NEW_EVENT, { detail }));
}

export function dispatchNotificationToast(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_TOAST_EVENT, { detail: { message } }));
}
