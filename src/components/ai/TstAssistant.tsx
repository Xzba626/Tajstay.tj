"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, X } from "lucide-react";
import { TstIcon } from "@/components/ai/TstIcon";
import { contextHintKey, parsePageContext } from "@/lib/ai/tstContext";
import {
  parseHistoryIntent,
  toHistoryHref,
  TST_HISTORY_QUICK,
  type TstHistoryIntent
} from "@/lib/ai/tstHistoryIntent";
import {
  maskEmail,
  parseAccountIntent,
  splitDisplayName,
  type TstAccountIntent
} from "@/lib/ai/tstAccountIntent";
import { isShellHiddenRoute } from "@/constants/app-navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import {
  applyActionDefaults,
  compareHotels,
  dropSoftFilters,
  getFollowUp,
  hotelHref,
  nearestMinPrice,
  parseContextQuery,
  rankWithContext,
  summarizeRooms,
  toSearchHref,
  toSearchParams,
  TST_CITIES,
  type TstAction,
  type TstHotel,
  type TstMatch,
  type TstOutcome,
  type TstParsedQuery,
  type TstReasonKey
} from "@/lib/ai/tstIntent";

type Props = { locale: Locale };

type Screen = "home" | "form" | "more";

type TstSessionUser = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
};

type MyBookingRow = {
  id: number;
  hotelName: string;
  roomTitle: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentBadge: string;
  detailPath: string;
  paymentPath: string | null;
  tab: string;
};

type MyBookingsPayload = {
  next: MyBookingRow | null;
  last: MyBookingRow | null;
  unpaid: MyBookingRow[];
  counts: Record<string, number>;
};

type BookConfirm = {
  hotelId: number;
  hotelName: string;
  city: string;
  minPrice: number;
};

type Notice = { tone: "info" | "warn" | "error"; text: string };

const HINT_KEY = "tajstay.tstAssistant.hintSeen";
/** TZ §31 — compact home; history/account under More. */
const PRIMARY_ACTIONS: TstAction[] = ["match", "budget", "location", "best", "room", "ask"];
const MORE_ACTIONS: TstAction[] = [
  "value",
  "view",
  "quiet",
  "center",
  "family",
  "business",
  "cheapest",
  "couple",
  "compare",
  "book",
  "history"
];

const LOCATION_CHIPS: Array<{ key: keyof TstParsedQuery; labelKey: string }> = [
  { key: "wantsCenter", labelKey: "tstAssistant.loc.center" },
  { key: "wantsQuiet", labelKey: "tstAssistant.loc.quiet" },
  { key: "wantsView", labelKey: "tstAssistant.loc.view" },
  { key: "wantsNature", labelKey: "tstAssistant.loc.nature" },
  { key: "wantsMountain", labelKey: "tstAssistant.loc.mountain" },
  { key: "wantsRiver", labelKey: "tstAssistant.loc.river" }
];

const MEDALS = ["🥇", "🥈", "🥉"];

function readHintSeen() {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function persistHintSeen() {
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* ignore */
  }
}

function whyText(locale: Locale, match: TstMatch) {
  const parts = match.reasons
    .map((reason: TstReasonKey) => {
      if (reason === "city") return m(locale, "tstAssistant.why.city", { city: match.hotel.city });
      if (reason === "budget") return m(locale, "tstAssistant.why.budget");
      if (reason === "available") return null;
      return m(locale, `tstAssistant.why.${reason}`);
    })
    .filter(Boolean);
  if (!parts.length) {
    return m(locale, "tstAssistant.why.fallback", { city: match.hotel.city, price: String(match.minPrice) });
  }
  return `${m(locale, "tstAssistant.why.prefix")} ${parts.join(", ")}.`;
}

async function fetchHotels(query: TstParsedQuery, signal?: AbortSignal): Promise<TstHotel[]> {
  const res = await fetch(`/api/search?${toSearchParams(query).toString()}`, { signal, credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { hotels?: TstHotel[] };
  return data.hotels ?? [];
}

async function fetchReferenceHotel(hotelId: number): Promise<TstHotel | null> {
  const hotels = await fetchHotels({});
  return hotels.find((hotel) => hotel.id === hotelId) ?? null;
}

async function fetchSessionUser(): Promise<TstSessionUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: TstSessionUser | null };
  return data.user ?? null;
}

async function fetchMyBookings(): Promise<MyBookingsPayload | null> {
  const res = await fetch("/api/tst/my-bookings", { credentials: "include", cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as MyBookingsPayload;
}

export function TstAssistant({ locale }: Props) {
  const pathname = usePathname() ?? "/";
  const rawSearch = useSearchParams()?.toString() ?? "";
  const router = useRouter();
  const pageContext = useMemo(() => parsePageContext(pathname, rawSearch), [pathname, rawSearch]);
  const titleId = useId();
  const inputId = useId();
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [draft, setDraft] = useState<TstParsedQuery>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<TstOutcome | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [nearestPrice, setNearestPrice] = useState<number | null>(null);
  const [referenceHotel, setReferenceHotel] = useState<TstHotel | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [roomsHotelId, setRoomsHotelId] = useState<number | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [historyIntent, setHistoryIntent] = useState<TstHistoryIntent | null>(null);
  const [sessionUser, setSessionUser] = useState<TstSessionUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bookConfirm, setBookConfirm] = useState<BookConfirm | null>(null);
  const [mySummary, setMySummary] = useState<MyBookingsPayload | null>(null);

  const hidden = isShellHiddenRoute(pathname);
  const ctxHint = contextHintKey(pageContext);
  const isAuthed = Boolean(sessionUser);

  const refreshSession = useCallback(async () => {
    const user = await fetchSessionUser();
    setSessionUser(user);
    setSessionChecked(true);
    return user;
  }, []);

  useEffect(() => {
    if (hidden || readHintSeen()) return;
    const timer = window.setTimeout(() => setShowHint(true), 700);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    void refreshSession();
    setDraft((prev) => ({ ...pageContext.searchDraft, ...prev }));
    if (pageContext.hotelId) {
      void fetchReferenceHotel(pageContext.hotelId).then(setReferenceHotel);
    }
  }, [open, pageContext.hotelId, pageContext.searchDraft, refreshSession]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const requireAuth = useCallback(
    (nextPath: string) => {
      setNotice({
        tone: "warn",
        text: m(locale, "tstAssistant.auth.required")
      });
      setBookConfirm(null);
      setScreen("home");
      return `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;
    },
    [locale]
  );

  const openHistory = useCallback(
    async (intent: TstHistoryIntent) => {
      const user = sessionChecked ? sessionUser : await refreshSession();
      if (!user) {
        setNotice({ tone: "warn", text: m(locale, "tstAssistant.auth.requiredHistory") });
        setFollowUp(m(locale, "tstAssistant.auth.requiredHistory"));
        return;
      }
      setHistoryIntent(intent);
      setOutcome(null);
      setError(null);
      const navKey =
        intent.unpaidOnly
          ? "tstAssistant.history.navUnpaid"
          : intent.tab === "confirmed"
            ? "tstAssistant.history.navConfirmed"
            : intent.tab === "unconfirmed"
              ? "tstAssistant.history.navUnconfirmed"
              : intent.tab === "past"
                ? "tstAssistant.history.navPast"
                : intent.tab === "cancelled"
                  ? "tstAssistant.history.navCancelled"
                  : "tstAssistant.history.navAll";
      setNotice({ tone: "info", text: m(locale, navKey) });
      setCompareOn(false);
      setRoomsHotelId(null);
      setSelectedIds([]);
      setScreen("home");
      router.push(toHistoryHref(intent));
      setOpen(false);
    },
    [locale, refreshSession, router, sessionChecked, sessionUser]
  );

  const openSecurePath = useCallback(
    (href: string, messageKey: string) => {
      setNotice({ tone: "info", text: m(locale, messageKey) });
      setBookConfirm(null);
      router.push(href);
      setOpen(false);
    },
    [locale, router]
  );

  const loadMyBookingsUi = useCallback(
    async (mode: "unpaid" | "next" | "last" | "help") => {
      const user = sessionChecked ? sessionUser : await refreshSession();
      if (!user) {
        setNotice({ tone: "warn", text: m(locale, "tstAssistant.auth.required") });
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyBookings();
        if (!data) {
          setNotice({ tone: "warn", text: m(locale, "tstAssistant.auth.required") });
          return;
        }
        setMySummary(data);
        setOutcome(null);
        setBookConfirm(null);
        if (mode === "unpaid") {
          if (!data.unpaid.length) {
            setNotice({ tone: "info", text: m(locale, "tstAssistant.account.noUnpaid") });
          } else {
            setNotice({
              tone: "info",
              text: m(locale, "tstAssistant.account.unpaidFound", { count: String(data.unpaid.length) })
            });
          }
        } else if (mode === "next") {
          setNotice({
            tone: "info",
            text: data.next
              ? m(locale, "tstAssistant.account.nextBooking", { hotel: data.next.hotelName })
              : m(locale, "tstAssistant.account.noNext")
          });
        } else if (mode === "last") {
          setNotice({
            tone: "info",
            text: data.last
              ? m(locale, "tstAssistant.account.lastBooking", { hotel: data.last.hotelName })
              : m(locale, "tstAssistant.account.noLast")
          });
        } else {
          setNotice({ tone: "info", text: m(locale, "tstAssistant.account.helpBooking") });
        }
        setScreen("home");
      } catch {
        setError(m(locale, "tstAssistant.error"));
      } finally {
        setLoading(false);
      }
    },
    [locale, refreshSession, sessionChecked, sessionUser]
  );

  const handleAccountIntent = useCallback(
    async (intent: TstAccountIntent) => {
      if (intent.kind === "refuse_cross_user") {
        setNotice({ tone: "error", text: m(locale, "tstAssistant.security.refuseCrossUser") });
        return;
      }
      if (intent.kind === "forgot_password") {
        openSecurePath("/auth/forgot-password", "tstAssistant.account.openForgot");
        return;
      }
      if (intent.kind === "change_password") {
        const user = sessionChecked ? sessionUser : await refreshSession();
        if (!user) {
          openSecurePath(requireAuth("/profile/security"), "tstAssistant.auth.required");
          return;
        }
        // Never accept password in chat — open secure profile flow.
        openSecurePath("/profile/security", "tstAssistant.account.openChangePassword");
        return;
      }
      if (intent.kind === "security") {
        const user = sessionChecked ? sessionUser : await refreshSession();
        if (!user) {
          openSecurePath(requireAuth("/profile/security"), "tstAssistant.auth.required");
          return;
        }
        openSecurePath("/profile/security", "tstAssistant.account.openSecurity");
        return;
      }
      if (intent.kind === "change_email") {
        const user = sessionChecked ? sessionUser : await refreshSession();
        if (!user) {
          openSecurePath(requireAuth("/profile/email"), "tstAssistant.auth.required");
          return;
        }
        openSecurePath("/profile/email", "tstAssistant.account.openEmail");
        return;
      }
      if (intent.kind === "connect_telegram") {
        const user = sessionChecked ? sessionUser : await refreshSession();
        if (!user) {
          openSecurePath(requireAuth("/profile/telegram"), "tstAssistant.auth.required");
          return;
        }
        openSecurePath("/profile/telegram", "tstAssistant.account.openTelegram");
        return;
      }
      if (intent.kind === "sign_in") {
        openSecurePath("/auth/sign-in?next=/", "tstAssistant.account.openSignIn");
        return;
      }
      if (intent.kind === "sign_up") {
        openSecurePath("/auth/sign-in?mode=register&next=/", "tstAssistant.account.openSignUp");
        return;
      }
      if (intent.kind === "profile") {
        const user = sessionChecked ? sessionUser : await refreshSession();
        if (!user) {
          openSecurePath(requireAuth("/profile"), "tstAssistant.auth.required");
          return;
        }
        openSecurePath("/profile", "tstAssistant.account.openProfile");
        return;
      }
      if (intent.kind === "unpaid" || intent.kind === "help_payment") {
        await loadMyBookingsUi("unpaid");
        return;
      }
      if (intent.kind === "next_booking") {
        await loadMyBookingsUi("next");
        return;
      }
      if (intent.kind === "last_booking") {
        await loadMyBookingsUi("last");
        return;
      }
      if (intent.kind === "help_booking") {
        await loadMyBookingsUi("help");
      }
    },
    [locale, loadMyBookingsUi, openSecurePath, refreshSession, requireAuth, sessionChecked, sessionUser]
  );

  const runSearch = useCallback(
    async (query: TstParsedQuery) => {
      setDraft(query);
      setHistoryIntent(null);
      setBookConfirm(null);
      setLoading(true);
      setError(null);
      setFollowUp(null);
      setCompareOn(false);
      setRoomsHotelId(null);
      setSelectedIds([]);
      setNearestPrice(null);
      setScreen("home");
      try {
        const ref =
          referenceHotel ??
          (query.referenceHotelId ? await fetchReferenceHotel(query.referenceHotelId) : null);
        const hotels = await fetchHotels(query);
        const ranked = rankWithContext(hotels, query, ref);
        if (
          ranked.status !== "ok" &&
          (query.maxPrice != null || query.wifi || query.wantsQuiet || query.wantsView || query.wantsCenter)
        ) {
          const wider = await fetchHotels(dropSoftFilters(query));
          setNearestPrice(nearestMinPrice(wider));
        }
        setOutcome(ranked);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: 0 });
        });
      } catch {
        setError(m(locale, "tstAssistant.error"));
        setOutcome(null);
      } finally {
        setLoading(false);
      }
    },
    [locale, referenceHotel]
  );

  const openPanel = () => {
    persistHintSeen();
    setShowHint(false);
    setOpen(true);
    setScreen("home");
    setOutcome(null);
    setFollowUp(null);
    setNotice(null);
    setBookConfirm(null);
  };

  const closePanel = () => {
    setOpen(false);
    fabRef.current?.focus();
  };

  const startBookConfirm = (match: TstMatch) => {
    setBookConfirm({
      hotelId: match.hotel.id,
      hotelName: match.hotel.name,
      city: match.hotel.city,
      minPrice: match.minPrice
    });
    setNotice(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const confirmBookingNavigate = async () => {
    if (!bookConfirm) return;
    const user = sessionChecked ? sessionUser : await refreshSession();
    if (!user) {
      const next = hotelHref(bookConfirm.hotelId, draft);
      router.push(requireAuth(next));
      setOpen(false);
      return;
    }
    const { first, last } = splitDisplayName(user.name);
    if (!first || !last) {
      setNotice({ tone: "warn", text: m(locale, "tstAssistant.booking.needName") });
      return;
    }
    // Do not silently create booking — hand off to existing hotel/checkout UI.
    setNotice({ tone: "info", text: m(locale, "tstAssistant.booking.openingCheckout") });
    router.push(hotelHref(bookConfirm.hotelId, draft));
    setOpen(false);
  };

  const onPrimaryAction = (action: TstAction | "unpaid" | "password" | "signIn" | "profile") => {
    if (action === "history") {
      void openHistory({ kind: "history", tab: "all" });
      return;
    }
    if (action === "unpaid") {
      void loadMyBookingsUi("unpaid");
      return;
    }
    if (action === "password") {
      void handleAccountIntent({ kind: "change_password" });
      return;
    }
    if (action === "signIn") {
      void handleAccountIntent({ kind: "sign_in" });
      return;
    }
    if (action === "profile") {
      void handleAccountIntent({ kind: "profile" });
      return;
    }
    if (action === "ask") {
      setScreen("home");
      inputRef.current?.focus();
      return;
    }
    if (action === "room") {
      if (pageContext.hotelId && referenceHotel) {
        setRoomsHotelId(referenceHotel.id);
        setScreen("home");
        return;
      }
      setDraft((prev) => ({ ...prev, action: "room" }));
      setScreen("form");
      return;
    }
    if (action === "compare") {
      setCompareOn(true);
      setScreen("more");
      return;
    }
    if (action === "book") {
      const target =
        pageContext.hotelId ?? selectedIds[0] ?? (outcome?.status === "ok" ? outcome.matches[0]?.hotel.id : null);
      const match =
        outcome?.status === "ok" ? outcome.matches.find((item) => item.hotel.id === target) : null;
      if (match) {
        startBookConfirm(match);
        return;
      }
      if (target) {
        router.push(hotelHref(target, draft));
        setOpen(false);
      }
      return;
    }
    const next = applyActionDefaults(action, { ...pageContext.searchDraft, ...draft });
    setDraft(next);
    if (action === "match" || action === "budget" || action === "location") {
      setScreen("form");
      return;
    }
    void runSearch(next);
  };

  const onSubmitText = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Never echo secrets back — if message looks like a password dump, refuse.
    if (/(?:пароль|password)\s*[:=]\s*\S+/i.test(text)) {
      setNotice({ tone: "warn", text: m(locale, "tstAssistant.security.noPasswordInChat") });
      setInput("");
      return;
    }

    const accountIntent = parseAccountIntent(text);
    if (accountIntent) {
      void handleAccountIntent(accountIntent);
      setInput("");
      return;
    }

    const historyFromText = parseHistoryIntent(text);
    if (historyFromText) {
      void openHistory(historyFromText);
      setInput("");
      return;
    }

    const merged = parseContextQuery(text, {
      hotelId: pageContext.hotelId,
      searchDraft: { ...pageContext.searchDraft, ...draft }
    });
    const missing = getFollowUp(merged);
    if (missing && !merged.city && !merged.maxPrice) {
      setFollowUp(m(locale, missing.key));
      setDraft(merged);
      return;
    }
    void runSearch(merged);
    setInput("");
  };

  if (hidden) return null;

  const matches = outcome?.status === "ok" ? outcome.matches : [];
  const selectedMatches = matches.filter((item) => selectedIds.includes(item.hotel.id));
  const compareRows = compareOn && selectedMatches.length >= 2 ? compareHotels(selectedMatches) : [];
  const roomsHotel =
    matches.find((item) => item.hotel.id === roomsHotelId)?.hotel ??
    (roomsHotelId && referenceHotel?.id === roomsHotelId ? referenceHotel : null);
  const roomGroups = roomsHotel ? summarizeRooms(roomsHotel) : [];
  const showForm = screen === "form" && (draft.action === "match" || draft.action === "budget" || draft.action === "location");
  const showResults = !loading && matches.length > 0 && !compareOn && !historyIntent;
  const showHistoryQuick = pageContext.kind === "history" && !loading && !showResults && isAuthed;

  return (
    <div className="tst-assistant">
      {open ? (
        <button type="button" className="tst-assistant__backdrop" aria-label={m(locale, "common.close")} onClick={closePanel} />
      ) : null}

      {open ? (
        <div ref={panelRef} className="tst-assistant__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="tst-assistant__toolbar">
            <p id={titleId} className="tst-assistant__toolbar-title">
              {m(locale, "tstAssistant.title")}
            </p>
            <button type="button" className="tst-assistant__icon-btn" onClick={closePanel} aria-label={m(locale, "common.close")}>
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="tst-assistant__panel-scroll">
            <div className="tst-assistant__hero">
              <div className={`tst-assistant__avatar ${loading ? "is-thinking" : ""}`}>
                <TstIcon size={34} thinking={loading} />
              </div>
              <p className="tst-assistant__brand">TST</p>
              <p className="tst-assistant__tagline">{m(locale, "tstAssistant.tagline")}</p>
              {sessionChecked && isAuthed ? (
                <p className="tst-assistant__context">
                  {m(locale, "tstAssistant.auth.signedInAs", {
                    name: sessionUser?.name?.trim() || maskEmail(sessionUser?.email)
                  })}
                </p>
              ) : null}
            </div>

            {loading ? (
              <div className="tst-assistant__thinking" aria-live="polite">
                <p>{m(locale, "tstAssistant.loading")}</p>
                <span className="tst-assistant__dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : null}

            {notice ? (
              <div className={`tst-assistant__notice${notice.tone === "warn" ? " tst-assistant__notice--warn" : ""}${notice.tone === "error" ? " tst-assistant__notice--error" : ""}`} role="status">
                {notice.text}
                {!isAuthed && (notice.tone === "warn") ? (
                  <div className="tst-assistant__btn-row">
                    <button type="button" className="tst-assistant__btn tst-assistant__btn--primary" onClick={() => openSecurePath("/auth/sign-in?mode=register&next=/", "tstAssistant.account.openSignUp")}>
                      {m(locale, "tstAssistant.auth.createAccount")}
                    </button>
                    <button type="button" className="tst-assistant__btn" onClick={() => openSecurePath("/auth/sign-in?next=/", "tstAssistant.account.openSignIn")}>
                      {m(locale, "tstAssistant.auth.signIn")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!loading && !showResults ? (
              <>
                <p className="tst-assistant__greeting">{followUp ?? m(locale, "tstAssistant.greeting")}</p>
                {ctxHint ? <p className="tst-assistant__context">{m(locale, ctxHint)}</p> : null}

                {showHistoryQuick ? (
                  <div className="tst-assistant__history-quick">
                    <p className="tst-assistant__label">{m(locale, "tstAssistant.history.filterTitle")}</p>
                    <div className="tst-assistant__chips">
                      {TST_HISTORY_QUICK.map((item) => (
                        <button
                          key={item.tab}
                          type="button"
                          className="tst-assistant__chip"
                          onClick={() => void openHistory({ kind: "history", tab: item.tab })}
                        >
                          {m(locale, item.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {screen !== "more" ? (
                  <div className="tst-assistant__actions">
                    {PRIMARY_ACTIONS.map((action) => (
                      <button key={action} type="button" className="tst-assistant__action" onClick={() => onPrimaryAction(action)}>
                        {m(locale, `tstAssistant.action.${action}`)}
                      </button>
                    ))}
                  </div>
                ) : null}

                {screen === "home" ? (
                  <button type="button" className="tst-assistant__more-toggle" onClick={() => setScreen("more")}>
                    {m(locale, "tstAssistant.more")}
                  </button>
                ) : null}

                {screen === "more" ? (
                  <div className="tst-assistant__actions tst-assistant__actions--compact">
                    {MORE_ACTIONS.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={`tst-assistant__chip ${compareOn && action === "compare" ? "is-on" : ""}`}
                        onClick={() => onPrimaryAction(action)}
                      >
                        {m(locale, `tstAssistant.action.${action}`)}
                      </button>
                    ))}
                    <button type="button" className="tst-assistant__chip" onClick={() => onPrimaryAction("unpaid")}>
                      {m(locale, "tstAssistant.action.unpaid")}
                    </button>
                    <button type="button" className="tst-assistant__chip" onClick={() => onPrimaryAction("password")}>
                      {m(locale, "tstAssistant.action.password")}
                    </button>
                    <button type="button" className="tst-assistant__chip" onClick={() => onPrimaryAction("signIn")}>
                      {m(locale, "tstAssistant.action.signIn")}
                    </button>
                    <button type="button" className="tst-assistant__chip" onClick={() => onPrimaryAction("profile")}>
                      {m(locale, "tstAssistant.action.profile")}
                    </button>
                    <button type="button" className="tst-assistant__more-toggle" onClick={() => setScreen("home")}>
                      {m(locale, "tstAssistant.less")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            {showForm ? (
              <div className="tst-assistant__form">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.form.city")}</p>
                <div className="tst-assistant__chips">
                  {TST_CITIES.map((city) => (
                    <button
                      key={city.canonical}
                      type="button"
                      className={`tst-assistant__chip ${draft.city === city.canonical ? "is-on" : ""}`}
                      onClick={() => setDraft((prev) => ({ ...prev, city: city.canonical }))}
                    >
                      {m(locale, `tstAssistant.city.${city.canonical}`)}
                    </button>
                  ))}
                </div>
                {(draft.action === "match" || draft.action === "budget") && (
                  <div className="tst-assistant__row">
                    <label className="tst-assistant__field">
                      <span>{m(locale, "tstAssistant.form.from")}</span>
                      <input
                        inputMode="numeric"
                        value={draft.minPrice ?? ""}
                        onChange={(e) => setDraft((prev) => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </label>
                    <label className="tst-assistant__field">
                      <span>{m(locale, "tstAssistant.form.to")}</span>
                      <input
                        inputMode="numeric"
                        value={draft.maxPrice ?? ""}
                        onChange={(e) => setDraft((prev) => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </label>
                  </div>
                )}
                {draft.action === "location" ? (
                  <div className="tst-assistant__chips">
                    {LOCATION_CHIPS.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        className={`tst-assistant__chip ${draft[chip.key] ? "is-on" : ""}`}
                        onClick={() => setDraft((prev) => ({ ...prev, [chip.key]: !prev[chip.key] }))}
                      >
                        {m(locale, chip.labelKey)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="tst-assistant__primary" onClick={() => void runSearch(draft)}>
                  {m(locale, "tstAssistant.form.find")}
                </button>
              </div>
            ) : null}

            {error ? <p className="tst-assistant__status is-error">{error}</p> : null}

            {(outcome?.status === "empty" || outcome?.status === "insufficient") && !loading ? (
              <div className="tst-assistant__empty">
                <p>
                  {outcome.status === "insufficient"
                    ? m(locale, `tstAssistant.insufficient.${outcome.kind}`)
                    : nearestPrice != null && draft.maxPrice != null
                      ? m(locale, draft.city ? "tstAssistant.empty.budget" : "tstAssistant.empty.budgetNoCity", {
                          max: String(draft.maxPrice),
                          min: String(Math.round(nearestPrice)),
                          city: draft.city ?? ""
                        })
                      : m(locale, "tstAssistant.empty.generic")}
                </p>
                <div className="tst-assistant__chips">
                  {nearestPrice != null ? (
                    <button type="button" className="tst-assistant__chip is-on" onClick={() => void runSearch(dropSoftFilters(draft))}>
                      {m(locale, "tstAssistant.empty.showNearest")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {compareOn && compareRows.length >= 2 ? (
              <div className="tst-assistant__compare">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.compare.title")}</p>
                <p className="tst-assistant__meta">{compareRows.map((row) => row.name).join(" · ")}</p>
              </div>
            ) : null}

            {showResults ? (
              <div className="tst-assistant__results-block">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.results.topTitle")}</p>
                <ul className="tst-assistant__results">
                  {matches.map((item, index) => (
                    <li key={item.hotel.id} className="tst-assistant__card">
                      <div>
                        <p className="tst-assistant__hotel">
                          {MEDALS[index] ?? "•"} {item.hotel.name}
                        </p>
                        <p className="tst-assistant__match">
                          {m(locale, "tstAssistant.results.matchLabel", { score: String(item.matchScore) })}
                        </p>
                        <p className="tst-assistant__meta">
                          {item.hotel.city}
                          {item.rating != null ? ` · ★ ${item.rating.toFixed(1)}` : ""}
                          {` · ${m(locale, "search.fromPrice")} ${item.minPrice} TJS`}
                        </p>
                        <p className="tst-assistant__why">{whyText(locale, item)}</p>
                        <div className="tst-assistant__links">
                          <Link href={hotelHref(item.hotel.id, draft)} onClick={closePanel}>
                            {m(locale, "tstAssistant.results.open")}
                          </Link>
                          <button type="button" className="tst-assistant__btn-link" onClick={() => startBookConfirm(item)}>
                            {m(locale, "tstAssistant.results.book")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href={toSearchHref(draft)} className="tst-assistant__search-link" onClick={closePanel}>
                  {m(locale, "tstAssistant.results.showSearch")}
                </Link>
              </div>
            ) : null}

            {roomGroups.length > 0 ? (
              <div className="tst-assistant__rooms">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.rooms.title")}</p>
                {roomGroups.map((group) => (
                  <div key={group.title} className="tst-assistant__room">
                    <p className="tst-assistant__hotel">{group.title}</p>
                    <p className="tst-assistant__meta">
                      {m(locale, "tstAssistant.rooms.count", { count: String(group.count) })}
                      {` · ${m(locale, "tstAssistant.rooms.from", { price: String(group.minPrice) })}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {bookConfirm ? (
              <div className="tst-assistant__booking-summary">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.booking.summaryTitle")}</p>
                <p className="tst-assistant__hotel">{bookConfirm.hotelName}</p>
                <p className="tst-assistant__meta">
                  {bookConfirm.city}
                  {` · ${m(locale, "search.fromPrice")} ${bookConfirm.minPrice} TJS`}
                </p>
                <p className="tst-assistant__meta">{m(locale, "tstAssistant.booking.summaryHint")}</p>
                <div className="tst-assistant__btn-row">
                  <button type="button" className="tst-assistant__btn" onClick={() => setBookConfirm(null)}>
                    {m(locale, "tstAssistant.booking.change")}
                  </button>
                  <button type="button" className="tst-assistant__btn tst-assistant__btn--primary" onClick={() => void confirmBookingNavigate()}>
                    {m(locale, "tstAssistant.booking.confirm")}
                  </button>
                </div>
              </div>
            ) : null}

            {mySummary?.unpaid?.length ? (
              <div className="tst-assistant__results-block">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.account.unpaidTitle")}</p>
                <ul className="tst-assistant__results">
                  {mySummary.unpaid.map((row) => (
                    <li key={row.id} className="tst-assistant__card">
                      <p className="tst-assistant__hotel">{row.hotelName}</p>
                      <p className="tst-assistant__meta">
                        {row.roomTitle} · {row.checkIn.slice(0, 10)}
                      </p>
                      <div className="tst-assistant__links">
                        <Link href={row.detailPath} onClick={closePanel}>
                          {m(locale, "tstAssistant.results.open")}
                        </Link>
                        {row.paymentPath ? (
                          <Link href={row.paymentPath} onClick={closePanel}>
                            {m(locale, "tstAssistant.account.goPay")}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {mySummary?.next && !mySummary.unpaid.length ? (
              <div className="tst-assistant__card">
                <p className="tst-assistant__label">{m(locale, "tstAssistant.account.nextTitle")}</p>
                <p className="tst-assistant__hotel">{mySummary.next.hotelName}</p>
                <p className="tst-assistant__meta">
                  {mySummary.next.roomTitle} · {mySummary.next.checkIn.slice(0, 10)}
                </p>
                <div className="tst-assistant__links">
                  <Link href={mySummary.next.detailPath} onClick={closePanel}>
                    {m(locale, "tstAssistant.results.open")}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <form className="tst-assistant__ask" onSubmit={onSubmitText}>
            <label className="sr-only" htmlFor={inputId}>
              {m(locale, "tstAssistant.inputPh")}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={m(locale, "tstAssistant.inputPh")}
              autoComplete="off"
            />
            <button type="submit" aria-label={m(locale, "tstAssistant.send")}>
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      ) : null}

      <div className={`tst-assistant__anchor${open ? " is-hidden" : ""}`}>
        {showHint && !open ? (
          <button type="button" className="tst-assistant__hint" onClick={openPanel}>
            {m(locale, "tstAssistant.hint")}
          </button>
        ) : null}
        {!open ? (
          <button
            ref={fabRef}
            type="button"
            className="tst-assistant__fab"
            aria-label={m(locale, "tstAssistant.fabLabel")}
            aria-expanded={open}
            aria-haspopup="dialog"
            title={m(locale, "tstAssistant.title")}
            onClick={openPanel}
          >
            <TstIcon size={22} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
