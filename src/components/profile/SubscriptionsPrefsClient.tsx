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

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="profile-subpage-toggle">
      <span className="profile-subpage-toggle__label">{label}</span>
      <input type="checkbox" className="profile-subpage-toggle__input" checked={checked} onChange={onChange} />
    </label>
  );
}

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
    <>
      <section className="profile-subpage-group">
        <h2 className="profile-subpage-group__title">{labels.topics}</h2>
        <div className="profile-subpage-group__body">
          {labels.topicsList.map((row) => (
            <ToggleRow key={row.key} label={row.label} checked={prefs[row.key]} onChange={() => toggle(row.key)} />
          ))}
        </div>
      </section>

      <section className="profile-subpage-group">
        <h2 className="profile-subpage-group__title">{labels.channels}</h2>
        <div className="profile-subpage-group__body">
          {labels.channelsList.map((row) => (
            <ToggleRow key={row.key} label={row.label} checked={prefs[row.key]} onChange={() => toggle(row.key)} />
          ))}
          <div className="profile-subpage-toggle profile-subpage-toggle--action">
            <span className="profile-subpage-toggle__label">{labels.channelPush}</span>
            <PushSubscribeButton labels={labels.pushLabels} />
          </div>
        </div>
      </section>
    </>
  );
}
