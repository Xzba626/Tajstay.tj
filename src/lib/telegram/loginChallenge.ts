import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getTelegramBotUsername } from "@/lib/telegram/config";
import { normalizePhone } from "@/lib/validation/phone";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_BYTES = 18;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

// SEC-004: the hardcoded "tajstay-telegram-dev" fallback was reachable in production if neither
// TELEGRAM_LOGIN_SECRET nor AUTH_SECRET were set — a known, guessable HMAC key would let an
// attacker forge valid login codes. AUTH_SECRET as a fallback is an intentional, documented
// policy (it's already required and validated in production via assertProdSecrets()), but the
// hardcoded literal is not: production now fails closed instead of silently using a public value.
function challengeSecret(): string {
  const configured = process.env.TELEGRAM_LOGIN_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "tajstay-telegram-dev";
  throw new Error("Security misconfiguration: TELEGRAM_LOGIN_SECRET/AUTH_SECRET missing in production.");
}

export function hashTelegramLoginCode(token: string, code: string): string {
  return crypto.createHmac("sha256", challengeSecret()).update(`${token}:${code}`).digest("hex");
}

// SEC: security-sensitive OTP must use a CSPRNG, not Math.random().
function generateLoginCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function buildTelegramDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `https://t.me/${bot}?start=login_${token}`;
}

export function buildTelegramAppDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `tg://resolve?domain=${bot}&start=login_${token}`;
}

/** Client-side fallback when API omits appDeepLink. */
export function linksFromTelegramDeepLink(deepLink: string): { webLink: string; appLink: string } {
  try {
    const url = new URL(deepLink);
    const bot = url.pathname.replace(/^\//, "");
    const start = url.searchParams.get("start") ?? "";
    return {
      webLink: deepLink,
      appLink: `tg://resolve?domain=${bot}&start=${encodeURIComponent(start)}`
    };
  } catch {
    return { webLink: deepLink, appLink: deepLink };
  }
}

export type TelegramChallengePublicStatus =
  | "pending"
  | "awaiting_phone"
  | "code_sent"
  | "expired"
  | "used"
  | "not_found";

export async function createTelegramLoginChallenge(): Promise<{
  token: string;
  deepLink: string;
  appDeepLink: string;
  expiresAt: string;
  expiresInSec: number;
}> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const codeHash = hashTelegramLoginCode(token, "pending");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.telegramLoginChallenge.create({
    data: { token, codeHash, expiresAt }
  });

  return {
    token,
    deepLink: buildTelegramDeepLink(token),
    appDeepLink: buildTelegramAppDeepLink(token),
    expiresAt: expiresAt.toISOString(),
    expiresInSec: Math.floor(CHALLENGE_TTL_MS / 1000)
  };
}

// TODO(PMS-telegram): if user.telegramId is already linked, skip Start and push OTP directly in Telegram.

function isExpired(challenge: { expiresAt: Date; usedAt: Date | null }): boolean {
  return challenge.expiresAt.getTime() < Date.now() || Boolean(challenge.usedAt);
}

export async function getTelegramChallengeStatus(token: string): Promise<{
  status: TelegramChallengePublicStatus;
  telegramUsername?: string | null;
  phoneMasked?: string | null;
  expiresAt?: string;
  attemptsLeft?: number;
}> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { status: "not_found" };
  if (challenge.usedAt) return { status: "used", telegramUsername: challenge.telegramUsername };
  if (isExpired(challenge)) return { status: "expired" };

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - challenge.attemptCount);

  if (challenge.phone && challenge.codeHash !== hashTelegramLoginCode(token, "pending")) {
    return {
      status: "code_sent",
      telegramUsername: challenge.telegramUsername,
      phoneMasked: maskPhone(challenge.phone),
      expiresAt: challenge.expiresAt.toISOString(),
      attemptsLeft
    };
  }
  if (challenge.telegramId) {
    return {
      status: "awaiting_phone",
      telegramUsername: challenge.telegramUsername,
      expiresAt: challenge.expiresAt.toISOString()
    };
  }
  return { status: "pending", expiresAt: challenge.expiresAt.toISOString() };
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `+${digits.slice(0, 3)} *** ** ${digits.slice(-2)}`;
}

/** After /start login_<token> — bind Telegram user, ask for contact. */
export async function attachTelegramOnStart(
  token: string,
  telegram: {
    id: number;
    username?: string | null;
    first_name?: string | null;
    photoUrl?: string | null;
    language_code?: string | null;
  }
): Promise<boolean> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge)) return false;

  const telegramId = String(telegram.id);
  if (challenge.telegramId && challenge.telegramId !== telegramId) return false;

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      telegramId,
      telegramUsername: telegram.username?.trim() || null,
      telegramFirstName: telegram.first_name?.trim() || null,
      telegramPhotoUrl: telegram.photoUrl ?? undefined
    }
  });
  return true;
}

/** User shared contact — save phone, send OTP message in Telegram (not SMS). */
export async function attachPhoneAndSendCode(
  token: string,
  telegramId: string,
  rawPhone: string,
  languageCode?: string | null
): Promise<{ ok: true } | { ok: false; reason: "expired" | "invalid" | "cooldown" }> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge)) return { ok: false, reason: "expired" };
  if (!challenge.telegramId || challenge.telegramId !== telegramId) return { ok: false, reason: "invalid" };

  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalid" };

  if (challenge.lastCodeSentAt) {
    const elapsed = Date.now() - challenge.lastCodeSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) return { ok: false, reason: "cooldown" };
  }

  const code = generateLoginCode();
  const codeHash = hashTelegramLoginCode(token, code);
  const now = new Date();

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      phone,
      codeHash,
      lastCodeSentAt: now,
      attemptCount: 0
    }
  });

  const locale = botLocaleFromTelegram(languageCode);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: Number(telegramId),
    text: L.codeSent(code),
    removeKeyboard: true
  });

  return { ok: true };
}

export type VerifyTelegramCodeResult =
  | { ok: true; userId: number; telegramId: string; isNew: boolean }
  | {
      ok: false;
      reason: "not_found" | "expired" | "invalid" | "too_many_attempts" | "no_code" | "account_link_required";
    };

/** User enters code on the website. */
export async function verifyTelegramLoginCode(
  token: string,
  code: string
): Promise<VerifyTelegramCodeResult> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { ok: false, reason: "not_found" };
  if (challenge.usedAt) return { ok: false, reason: "invalid" };
  if (isExpired(challenge)) return { ok: false, reason: "expired" };
  if (!challenge.telegramId || !challenge.phone) return { ok: false, reason: "no_code" };
  if (challenge.codeHash === hashTelegramLoginCode(token, "pending")) {
    return { ok: false, reason: "no_code" };
  }

  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6) {
    await prisma.telegramLoginChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } }
    });
    return { ok: false, reason: "invalid" };
  }

  const expected = hashTelegramLoginCode(token, normalized);
  if (expected !== challenge.codeHash) {
    await prisma.telegramLoginChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } }
    });
    return { ok: false, reason: "invalid" };
  }

  // Atomic single-use claim: two concurrent requests can both reach this point with a correct
  // code (both read usedAt: null above before either wrote). `updateMany` with `usedAt: null` in
  // the WHERE clause is a conditional compare-and-set at the database level — only the request
  // whose UPDATE actually matches a row (count === 1) may proceed to resolve/create a User;
  // the loser sees count === 0 and is rejected, instead of both racing into
  // resolveUserFromChallenge() and hitting a duplicate-user crash or, worse, a double session.
  const claim = await prisma.telegramLoginChallenge.updateMany({
    where: { id: challenge.id, usedAt: null },
    data: { verifiedAt: new Date(), usedAt: new Date() }
  });
  if (claim.count !== 1) {
    return { ok: false, reason: "invalid" };
  }

  const resolved = await resolveUserFromChallenge(challenge);
  if (!resolved.ok) return resolved;

  return { ok: true, ...resolved.value };
}

// SEC-001 follow-up: a verified Telegram identity (telegramId) only proves control of that
// Telegram account, NOT ownership of whatever TajStay account happens to already use the shared
// phone number. The previous `find by telegramId || find by phone` fallback let a brand-new
// Telegram identity silently take over an existing User purely by phone match - this is the
// authentication-boundary bug SEC-001 was filed against. Fixed policy:
//   - telegramId already linked to a User -> that User (unambiguous, safe). Login proves Telegram
//     identity; it does NOT authorize changing User.phone as a side effect (see Case E below) -
//     authentication and profile/account mutation are different operations.
//   - telegramId not linked, phone unused -> create a new User (safe, no collision).
//   - phone (from the shared contact) belongs to a DIFFERENT existing User than the one resolved
//     by telegramId -> FAIL CLOSED (account_link_required) instead of granting a session or
//     mutating either account. No explicit, verified account-link flow exists yet - inventing one
//     is out of scope for this hotfix; refusing is the safe default until one is built. The
//     collision is checked BEFORE any write, so this never depends on catching a unique-constraint
//     exception (a predictable identity conflict is a controlled outcome, not a 500).
async function resolveUserFromChallenge(
  challenge: {
    id: number;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramFirstName: string | null;
    telegramPhotoUrl: string | null;
    phone: string | null;
  }
): Promise<
  | { ok: true; value: { userId: number; telegramId: string; isNew: boolean } }
  | { ok: false; reason: "invalid" | "account_link_required" }
> {
  if (!challenge.telegramId || !challenge.phone) return { ok: false, reason: "invalid" };
  const telegramId = challenge.telegramId;
  const phone = challenge.phone;
  const displayName =
    challenge.telegramFirstName?.trim() ||
    (challenge.telegramUsername ? `@${challenge.telegramUsername.replace(/^@/, "")}` : null) ||
    `Telegram ${telegramId}`;

  const byTelegramId = await prisma.user.findUnique({ where: { telegramId } });

  if (byTelegramId) {
    // Case E: the shared contact's phone number is NOT a command to change this account's phone.
    // If it differs from what's on file, check ownership before touching anything.
    if (byTelegramId.phone !== phone) {
      const phoneOwner = await prisma.user.findUnique({ where: { phone } });
      if (phoneOwner && phoneOwner.id !== byTelegramId.id) {
        // Case D: known Telegram identity, but the shared number belongs to a different User.
        // Controlled conflict - no mutation to either account, no session for either.
        return { ok: false, reason: "account_link_required" };
      }
      // Number is unused (or, impossibly, already this same user's) - login proceeds, but we do
      // NOT silently overwrite the stored phone. A phone change is a separate, explicit
      // profile/settings action with its own confirmation, not a side effect of Telegram login.
    }
    const user = await prisma.user.update({
      where: { id: byTelegramId.id },
      data: {
        verified: true,
        telegramUsername: challenge.telegramUsername ?? byTelegramId.telegramUsername,
        telegramPhotoUrl: challenge.telegramPhotoUrl ?? byTelegramId.telegramPhotoUrl,
        image: challenge.telegramPhotoUrl ?? byTelegramId.image,
        name: byTelegramId.name?.trim() ? byTelegramId.name : displayName
      }
    });
    return { ok: true, value: { userId: user.id, telegramId, isNew: false } };
  }

  const byPhone = await prisma.user.findUnique({ where: { phone } });
  if (byPhone) {
    // This phone already belongs to a different account than the one authenticating via
    // Telegram right now - do not log in as them.
    return { ok: false, reason: "account_link_required" };
  }

  const user = await prisma.user.create({
    data: {
      name: displayName,
      phone,
      password: await hashPassword(`tg-${crypto.randomBytes(12).toString("hex")}`),
      role: "GUEST",
      verified: true,
      phoneVerified: true,
      telegramId,
      telegramUsername: challenge.telegramUsername,
      telegramPhotoUrl: challenge.telegramPhotoUrl,
      image: challenge.telegramPhotoUrl ?? undefined
    }
  });
  return { ok: true, value: { userId: user.id, telegramId, isNew: true } };
}

/** Notify user in Telegram after successful site verification. */
export async function notifyTelegramLoginSuccess(telegramId: string, languageCode?: string | null): Promise<void> {
  const locale = botLocaleFromTelegram(languageCode);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: Number(telegramId),
    text: L.confirmed
  });
}

export function parseLoginStartPayload(text: string | undefined): string | null {
  if (!text) return null;
  const parts = text.trim().split(/\s+/);
  const payload = parts[1] || (parts[0]?.startsWith("login_") ? parts[0] : null);
  if (!payload?.startsWith("login_")) return null;
  const token = payload.slice("login_".length).trim();
  return token.length >= 8 ? token : null;
}
