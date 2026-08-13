"use client";

import { useEffect, useState } from "react";
import { PushSubscribeButton } from "@/components/pwa/PushSubscribeButton";

const STORAGE_KEY = "tajstay.profile.subscriptions.v1";

type TopicKey = "promo" | "priceDrop" | "newHotels" | "tstTips" | "bookingReminders" | "news";
type ChannelKey = "email" | "sms" | "telegram";

type Prefs = Record<TopicKey | ChannelKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  promo: true,
  priceDrop: true,
  newHotels: true,
  tstTips: true,
  bookingReminders: true,
  news: false,
  email: true,
  sms: false,
  telegram: true
};

type Labels = {
  topics: string;
  channels: string;
  topicsList: { key: TopicKey; label: string }[];
  channelsList: { key: ChannelKey; label: string }[];
  pushLabels: { enable: string; enabled: string; denied: string; unsupported: string };
  channelPush: string;
};

export function SubscriptionsPrefsClient({ labels }: { labels: Labels }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggle(key: TopicKey | ChannelKey) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (!ready) return null;

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {labels.topics}
        </h2>
        <div className="profile-center__menu">
          {labels.topicsList.map((row) => (
            <label key={row.key} className="profile-center__row cursor-pointer">
              <span className="profile-center__row-body">
                <span className="profile-center__row-label">{row.label}</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--green-accent)]"
                checked={prefs[row.key]}
                onChange={() => toggle(row.key)}
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {labels.channels}
        </h2>
        <div className="profile-center__menu">
          {labels.channelsList.map((row) => (
            <label key={row.key} className="profile-center__row cursor-pointer">
              <span className="profile-center__row-body">
                <span className="profile-center__row-label">{row.label}</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--green-accent)]"
                checked={prefs[row.key]}
                onChange={() => toggle(row.key)}
              />
            </label>
          ))}
          <div className="profile-center__row">
            <span className="profile-center__row-body">
              <span className="profile-center__row-label">{labels.channelPush}</span>
            </span>
            <PushSubscribeButton labels={labels.pushLabels} />
          </div>
        </div>
      </section>
    </div>
  );
}
