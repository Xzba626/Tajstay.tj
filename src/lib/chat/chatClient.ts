import type { ChatMessageDto } from "@/lib/chat/messageDto";

export const CHAT_FETCH_TIMEOUT_MS = 25_000;
export const CHAT_POLL_INTERVAL_MS = 3_500;
export const CHAT_RETRY_ATTEMPTS = 3;
export const CHAT_RETRY_BASE_MS = 800;

export type ChatMessagesResponse = {
  ok?: boolean;
  messages?: ChatMessageDto[];
  chatArchived?: boolean;
  canSend?: boolean;
  booking?: {
    status: string;
    paymentStatus: string;
    expiresAt: string | null;
    proofReviewDeadlineAt: string | null;
    paymentTimerPaused: boolean;
  };
  error?: string;
};

export function mapChatApiError(raw: string | undefined): string {
  const v = (raw || "").trim();
  const lower = v.toLowerCase();
  if (lower === "invalid bookingid" || v === "Invalid bookingId")
    return "Неверная ссылка на чат. Обновите страницу или откройте бронь из «Мои бронирования».";
  if (lower === "invalid" || lower === "invalid id" || lower === "invalid payload")
    return "Запрос отклонён. Обновите страницу, выйдите и войдите снова или откройте чат из «Мои бронирования».";
  if (v === "Unauthorized") return "Сессия истекла — войдите снова.";
  if (v === "Forbidden") return "Нет доступа к этому чату.";
  if (lower === "not found") return "Бронирование не найдено.";
  return v || "";
}

export function messageFromChatResponse(res: Response, json: { error?: string }): string {
  const mapped = mapChatApiError(json.error);
  if (mapped) return mapped;
  if (res.status === 401) return "Сессия истекла — войдите снова.";
  if (res.status === 403) return "Нет доступа к этому чату.";
  if (res.status === 404) return "Бронирование не найдено.";
  if (res.status === 408 || res.status === 504) return "Сервер не ответил вовремя. Проверьте сеть и попробуйте снова.";
  if (res.status >= 500) return "Сервер временно недоступен. Попробуйте через минуту.";
  return `Ошибка сети (${res.status})`;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function fetchWithChatRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempts = CHAT_RETRY_ATTEMPTS
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CHAT_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(input, {
        ...init,
        credentials: init?.credentials ?? "include",
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      if (res.ok || !isRetryableStatus(res.status) || i === attempts - 1) {
        return res;
      }
      lastError = new Error(messageFromChatResponse(res, {}));
    } catch (e) {
      window.clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        lastError = new Error("Сервер не ответил вовремя. Проверьте сеть и попробуйте снова.");
      } else {
        lastError = e instanceof Error ? e : new Error("Ошибка сети");
      }
      if (i === attempts - 1) throw lastError;
    }

    await sleep(CHAT_RETRY_BASE_MS * (i + 1));
  }

  throw lastError ?? new Error("Ошибка сети");
}

export async function fetchChatMessages(bookingId: number): Promise<ChatMessagesResponse> {
  const res = await fetchWithChatRetry(`/api/chat/booking/${bookingId}/messages`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" }
  });
  const json = (await res.json().catch(() => ({}))) as ChatMessagesResponse;
  if (!res.ok) throw new Error(messageFromChatResponse(res, json));
  return json;
}

export async function postChatMessage(
  bookingId: number,
  payload: { text: string; file?: File | null }
): Promise<ChatMessagesResponse> {
  const message = payload.text.trim();
  const file = payload.file ?? null;

  let res: Response;
  if (file) {
    const fd = new FormData();
    fd.set("message", message);
    fd.set("file", file);
    res = await fetchWithChatRetry(`/api/chat/booking/${bookingId}/messages`, {
      method: "POST",
      credentials: "include",
      body: fd
    });
  } else {
    res = await fetchWithChatRetry(`/api/chat/booking/${bookingId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ message })
    });
  }

  const json = (await res.json().catch(() => ({}))) as ChatMessagesResponse;
  if (!res.ok) throw new Error(messageFromChatResponse(res, json));
  return json;
}

export type ChatConnectionStatus = "connecting" | "live" | "polling" | "reconnecting" | "offline";

/** SSE with auto-reconnect; always use polling in parallel as backup. */
export function connectBookingChatStream(
  bookingId: number,
  onEvent: () => void,
  onStatus?: (status: ChatConnectionStatus) => void
): () => void {
  if (typeof EventSource === "undefined") {
    onStatus?.("polling");
    return () => undefined;
  }

  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let backoffMs = 2_000;

  const connect = () => {
    if (closed) return;
    es?.close();
    onStatus?.(reconnectTimer ? "reconnecting" : "connecting");

    es = new EventSource(`/api/chat/booking/${bookingId}/stream`, { withCredentials: true });

    es.onopen = () => {
      backoffMs = 2_000;
      onStatus?.("live");
    };

    es.onmessage = () => {
      onEvent();
    };

    es.onerror = () => {
      es?.close();
      es = null;
      onStatus?.("reconnecting");
      if (closed) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, backoffMs);
      backoffMs = Math.min(Math.floor(backoffMs * 1.6), 30_000);
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    es?.close();
  };
}
