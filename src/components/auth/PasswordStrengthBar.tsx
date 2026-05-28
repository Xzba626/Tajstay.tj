"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

function scorePassword(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 8) return 0;
  let score = 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score = Math.min(3, score + 1) as 1 | 2 | 3;
  return score as 0 | 1 | 2 | 3;
}

export function PasswordStrengthBar({
  password,
  labels
}: {
  password: string;
  labels: { weak: string; fair: string; strong: string };
}) {
  const score = useMemo(() => scorePassword(password), [password]);
  if (!password) return null;

  const label = score <= 1 ? labels.weak : score === 2 ? labels.fair : labels.strong;

  return (
    <div className="taj-password-strength" aria-live="polite">
      <div className="taj-password-strength__bars">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("taj-password-strength__bar", i < score && `taj-password-strength__bar--${score}`)}
          />
        ))}
      </div>
      <span className="taj-password-strength__label">{label}</span>
    </div>
  );
}
