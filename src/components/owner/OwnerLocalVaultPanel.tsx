"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type DeviceRow = {
  id: string;
  deviceId: string;
  hotelId: number;
  status: string;
  presence?: string;
  platform: string;
  architecture: string;
  appVersion: string | null;
  activatedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

type ActivationPayload = {
  activationCode: string;
  expiresAt: string;
};

function formatActivationCode(raw: string): string {
  const digits = String(raw ?? "").replace(/\s+/g, "");
  return digits.replace(/(.{2})(?=.)/g, "$1 ");
}

function shortDeviceLabel(deviceId: string): string {
  const s = String(deviceId ?? "").trim();
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `…${s.slice(-8)}`;
}

function mapLvError(locale: Locale, status: number, code?: string): string {
  if (code === "RATE_LIMITED" || status === 429) {
    return m(locale, "owner.localVault.errorRateLimited");
  }
  if (status === 401 || status === 403 || code === "INVALID_DEVICE_IDENTITY") {
    return m(locale, "owner.localVault.errorNoAccess");
  }
  if (status === 503 || code === "HOTEL_NOT_AVAILABLE") {
    return m(locale, "owner.localVault.errorUnavailable");
  }
  return m(locale, "owner.localVault.errorGeneric");
}

function formatWhen(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return m(locale, "owner.localVault.never");
  try {
    return new Date(iso).toLocaleString(locale === "tg" ? "tg-TJ" : locale === "en" ? "en-GB" : "ru-RU");
  } catch {
    return iso;
  }
}

export function OwnerLocalVaultPanel({ locale, hotelId }: { locale: Locale; hotelId: number }) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activation, setActivation] = useState<ActivationPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokedFlashId, setRevokedFlashId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/local-vault/devices?hotelId=${hotelId}`, { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as {
        devices?: DeviceRow[];
        error?: { code?: string };
      };
      if (!res.ok) {
        setError(mapLvError(locale, res.status, json.error?.code));
        setDevices([]);
        return;
      }
      setDevices(json.devices ?? []);
    } catch {
      setError(m(locale, "owner.localVault.errorNetwork"));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activation) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activation]);

  const expiresAtMs = activation ? Date.parse(activation.expiresAt) : NaN;
  const remainingSec = useMemo(() => {
    if (!Number.isFinite(expiresAtMs)) return 0;
    return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  }, [expiresAtMs, nowMs]);
  const codeExpired = Boolean(activation) && remainingSec <= 0;

  async function createCode() {
    setBusy(true);
    setError(null);
    setCopied(false);
    setActivation(null);
    try {
      const res = await fetch("/api/local-vault/activation-codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        activationCode?: string;
        expiresAt?: string;
        error?: { code?: string };
      };
      if (!res.ok || !json.activationCode || !json.expiresAt) {
        setError(mapLvError(locale, res.status, json.error?.code));
        return;
      }
      setActivation({
        activationCode: json.activationCode,
        expiresAt: json.expiresAt,
      });
      setNowMs(Date.now());
    } catch {
      setError(m(locale, "owner.localVault.errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!activation || codeExpired) return;
    const plain = activation.activationCode.replace(/\s+/g, "");
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(m(locale, "owner.localVault.errorCopy"));
    }
  }

  async function revokeDevice(bindingId: string) {
    const ok = window.confirm(m(locale, "owner.localVault.revokeConfirm"));
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/local-vault/devices/${encodeURIComponent(bindingId)}/revoke`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      if (!res.ok) {
        setError(mapLvError(locale, res.status, json.error?.code));
        return;
      }
      setRevokedFlashId(bindingId);
      window.setTimeout(() => setRevokedFlashId(null), 4000);
      void load();
    } catch {
      setError(m(locale, "owner.localVault.errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  function statusLabel(status: string) {
    if (status === "ACTIVE") return m(locale, "owner.localVault.statusActive");
    if (status === "REVOKED") return m(locale, "owner.localVault.statusRevoked");
    return status;
  }

  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const countdownText = m(locale, "owner.localVault.validFor", {
    time: `${mm}:${String(ss).padStart(2, "0")}`,
  });

  return (
    <section className="owner-panel space-y-4" data-testid="owner-local-vault-panel">
      <p className="owner-section-lead">{m(locale, "owner.localVault.lead")}</p>

      {activation ? (
        <div
          className="rounded-2xl border border-[var(--border-subtle,#d8e4dc)] bg-white p-4 space-y-3"
          role="status"
          data-testid="owner-local-vault-code-card"
        >
          <h3 className="text-base font-semibold text-[var(--text-primary-semantic,#0f1f17)]">
            {m(locale, "owner.localVault.codeTitle")}
          </h3>
          {codeExpired ? (
            <>
              <p className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">
                {m(locale, "owner.localVault.codeExpired")}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void createCode()}
              >
                {m(locale, "owner.localVault.createNewCode")}
              </button>
            </>
          ) : (
            <>
              <p
                className="font-mono text-2xl tracking-wider text-[var(--text-primary-semantic,#0f1f17)]"
                data-testid="owner-local-vault-code"
              >
                {formatActivationCode(activation.activationCode)}
              </p>
              <p className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">{countdownText}</p>
              <p className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">
                {m(locale, "owner.localVault.codeHint")}
              </p>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => void copyCode()}
              >
                {copied ? m(locale, "owner.localVault.copied") : m(locale, "owner.localVault.copyCode")}
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary-semantic,#0f1f17)]">
          {m(locale, "owner.localVault.devicesTitle")}
        </h3>
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          data-testid="owner-local-vault-add"
          onClick={() => void createCode()}
        >
          {m(locale, "owner.localVault.addDevice")}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">{m(locale, "owner.localVault.loading")}</p> : null}

      {!loading && !devices.length ? (
        <p className="text-sm text-[var(--text-secondary-semantic,#4a6356)]" data-testid="owner-local-vault-empty">
          {m(locale, "owner.localVault.empty")}
        </p>
      ) : null}

      <ul className="space-y-3">
        {devices.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-[var(--border-subtle,#d8e4dc)] bg-white p-4"
            data-testid="owner-local-vault-device"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-semibold text-[var(--text-primary-semantic,#0f1f17)]">
                  {m(locale, "owner.localVault.deviceFallback", { id: shortDeviceLabel(d.deviceId) })}
                </div>
                <div className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">
                  {statusLabel(d.status)}
                  {d.appVersion ? ` · v${d.appVersion}` : ""}
                  {d.platform || d.architecture
                    ? ` · ${[d.platform, d.architecture].filter(Boolean).join(" / ")}`
                    : ""}
                </div>
                <div className="text-xs text-[var(--text-tertiary-semantic,#6b7f74)]">
                  {m(locale, "owner.localVault.activatedAt")}: {formatWhen(locale, d.activatedAt)}
                </div>
                <div className="text-xs text-[var(--text-tertiary-semantic,#6b7f74)]">
                  {m(locale, "owner.localVault.lastSeenAt")}: {formatWhen(locale, d.lastSeenAt)}
                </div>
                {revokedFlashId === d.id ? (
                  <p className="text-sm text-[var(--brand-green,#0F7A4D)]" role="status">
                    {m(locale, "owner.localVault.revokedFlash")}
                  </p>
                ) : null}
              </div>
              {d.status === "ACTIVE" ? (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => void revokeDevice(d.id)}
                >
                  {m(locale, "owner.localVault.revoke")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
