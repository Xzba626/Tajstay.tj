type Props = {
  label: string;
};

export function NotificationsMarkReadButton({ label }: Props) {
  return (
    <button type="submit" className="taj-notification-mark-read">
      {label}
    </button>
  );
}
