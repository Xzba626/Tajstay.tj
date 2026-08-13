import crypto from "crypto";
import { Auth } from "@auth/core";
import Google from "@auth/core/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { isGoogleOAuthConfigured } from "@/lib/auth/googleOAuthEnv";
import { getPublicOriginFromRequest } from "@/lib/http/publicOrigin";

const DEV_AUTH_FALLBACK_SECRET = "tajstay-dev-auth-secret-local-only-please-change";
let didWarnAboutDevSecret = false;

function withPublicOrigin(request: Request): Request {
  const url = new URL(request.url);
  const origin = getPublicOriginFromRequest(request);
  const normalized = new URL(url.pathname + url.search, origin);
  return new Request(normalized.toString(), request);
}

function buildDisplayName(inputName?: string | null, inputEmail?: string | null): string {
  if (inputName?.trim()) return inputName.trim();
  if (inputEmail?.trim()) return inputEmail.split("@")[0] || "Google User";
  return "Google User";
}

function resolveAuthSecret(): string {
  const configured = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    if (!didWarnAboutDevSecret) {
      didWarnAboutDevSecret = true;
      console.warn("[auth] AUTH_SECRET is missing. Using development fallback secret.");
    }
    return DEV_AUTH_FALLBACK_SECRET;
  }
  return "";
}

async function buildUniquePhone(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `google_${Date.now()}_${crypto.randomInt(1000, 9999)}`;
    const existing = await prisma.user.findUnique({ where: { phone: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `google_${crypto.randomUUID()}`;
}

const authConfig = {
  adapter: {
    ...(PrismaAdapter(prisma) as any),
    // Keep custom fields in existing User model compatible with Google OAuth.
    async createUser(data: any) {
      const password = await hashPassword(crypto.randomUUID());
      const phone = await buildUniquePhone();

      return (await prisma.user.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          image: data.image,
          name: buildDisplayName(data.name, data.email),
          phone,
          password,
          verified: true
        }
      })) as any;
    }
  } as any,
  providers: [
    ...(isGoogleOAuthConfigured()
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim()
          })
        ]
      : [])
  ],
  session: { strategy: "database" as const },
  secret: resolveAuthSecret(),
  trustHost: true,
  basePath: "/api/auth",
  pages: {
    signIn: "/auth/sign-in"
  },
  callbacks: {
    async session({ session, user }: any) {
      if (session.user) {
        session.user.id = String(user.id);
      }
      return session;
    }
  }
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  return (await Auth(withPublicOrigin(request), authConfig as any)) as unknown as Response;
}

export async function POST(request: Request) {
  return (await Auth(withPublicOrigin(request), authConfig as any)) as unknown as Response;
}
