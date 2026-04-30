# Newsletter Multi-Tenant Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Clerk-backed multi-tenancy, newsletter ownership + globally unique slugs, public `/p/[slug]` landing with double opt-in subscribe + confirm flow, and ownership guards on existing APIs—per `docs/superpowers/specs/2026-04-30-newsletter-multi-tenant-phase1-design.md`.

**Architecture:** Clerk middleware protects creator/dashboard routes and sensitive `/api/*` handlers; Prisma gains `User`, `Subscriber`, and extended `Newsletter` (`userId`, `slug`, optional landing copy). Public subscribe uses hashed confirmation tokens + Resend (`fetch` to `api.resend.com` mirroring publish). In-memory fixed-window rate limiting ships for single-instance correctness; docs note Redis/Upstash for horizontal scale.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk (`@clerk/nextjs`), Prisma 7 + SQLite/Turso adapter stack unchanged, Zod 4, Resend HTTP API, Vitest for pure helpers.

---

### File map (create / modify)

| Path | Role |
|------|------|
| `prisma/schema.prisma` | `User`, `Subscriber`, `Newsletter` extensions |
| `prisma/migrations/*/migration.sql` | Generated migration(s); legacy-safe nullable `userId`/`slug` until backfill |
| `scripts/backfill-phase1-ownership.ts` | One-shot: upsert bootstrap `User`, assign `userId`, synthesize unique `slug`s |
| `middleware.ts` | Clerk `clerkMiddleware`; public `/`, `/p`, `/subscribe`, `/api/public/*`; protect `/dashboard`, `/newsletter`, sensitive APIs |
| `app/layout.tsx` | Wrap tree with `<ClerkProvider>` (keep existing html/body/metadata pattern) |
| `app/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` |
| `app/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` |
| `lib/current-user.ts` | Map Clerk session → Prisma `User` via lazy upsert |
| `lib/newsletter-owner.ts` | `findNewsletterForOwner`, `ensureNewsletterOwner` returning `NextResponse` errors |
| `lib/subscribe-token.ts` | `randomUrlToken`, `hashToken`, `timingSafeEqualHex` |
| `lib/subscribe-email.ts` | Build confirmation URL + send via Resend fetch |
| `lib/rate-limit-subscribe.ts` | Fixed-window limiter keyed `ip|slug` + `ip|emailNorm|slug` |
| `lib/slug.ts` | `slugifySegment`, `generateCandidateSlug`, collision retry with nanoid suffix |
| `app/api/public/subscribe/route.ts` | `POST` subscribe handler |
| `app/subscribe/confirm/route.ts` | `GET` validate token → redirect success/failure |
| `app/subscribe/success/page.tsx` | Neutral success UI |
| `app/subscribe/error/page.tsx` | Neutral failure UI |
| `app/p/[slug]/page.tsx` | Server component landing + client subscribe form subset |
| `app/p/[slug]/subscribe-form.tsx` | `"use client"` form posting to `/api/public/subscribe` |
| `app/dashboard/layout.tsx` | Optional dashboard chrome |
| `app/dashboard/page.tsx` | Signed-in home: list newsletters + link create flow |
| `app/dashboard/newsletter/[id]/topics/*` | Moved topics route subtree (same components, updated imports/links) |
| `app/dashboard/newsletter/[id]/draft/*` | Moved draft subtree |
| `app/page.tsx` | Public landing: Sign in / Go to dashboard + short copy |
| `app/home-form.tsx` | Redirect target `/dashboard` generate flow OR duplicate under dashboard |
| `app/api/generate-topics/route.ts` | Require auth user; attach `userId`; allocate unique `slug` |
| `app/api/newsletters/[id]/route.ts` | Ownership guard; expose `slug`, `displayName`, `tagline` in JSON |
| `app/api/newsletters/[id]/topics/route.ts` | Ownership guard |
| `app/api/generate-draft/route.ts` | Ownership guard |
| `app/api/publish/route.ts` | Ownership guard |
| `.env.example` | Clerk keys + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `APP_URL` |
| `vitest.config.ts` | Vitest node environment |
| `package.json` | `"test": "vitest run"` + devDependency `vitest` |
| `lib/subscribe-token.test.ts` | Tests for hash + timing-safe compare |

---

### Task 1: Prisma schema — `User`, `Subscriber`, extend `Newsletter`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Apply schema edits**

Add models and fields exactly as below (SQLite-compatible). Keep existing `Newsletter` / `Topic` fields.

```prisma
model User {
  id           String        @id @default(uuid())
  clerkUserId  String        @unique
  email        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  newsletters  Newsletter[]
}

model Newsletter {
  id             String       @id @default(uuid())
  niche          String
  mastraThreadId String       @unique
  status         String       @default("RESEARCHING")
  finalDraft     String?
  userId         String?
  user           User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug           String?      @unique
  displayName    String?
  tagline        String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  topics         Topic[]
  subscribers    Subscriber[]
}

model Subscriber {
  id                      String      @id @default(uuid())
  newsletterId            String
  newsletter              Newsletter  @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  emailNormalized         String
  status                  String      @default("pending")
  confirmationTokenHash   String?
  confirmationExpiresAt   DateTime?
  confirmedAt             DateTime?
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  @@unique([newsletterId, emailNormalized])
}
```

- [ ] **Step 2: Generate migration**

Run:

```bash
pnpm prisma migrate dev --name phase1_multi_tenant
```

Expected: new folder under `prisma/migrations/` with SQL applying nullable `userId`/`slug`/landing fields + `User`/`Subscriber` tables.

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
pnpm prisma generate
```

Expected: `lib/generated/prisma` updates without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): User, Subscriber, Newsletter ownership fields"
```

---

### Task 2: Backfill script for legacy newsletters

**Files:**
- Create: `scripts/backfill-phase1-ownership.ts`

- [ ] **Step 1: Implement script**

Requirements:

1. Read **`LEGACY_BOOTSTRAP_CLERK_USER_ID`** (required) and optional **`LEGACY_BOOTSTRAP_EMAIL`**.
2. Instantiate **`PrismaClient`** with the same adapter rules as `lib/prisma.ts` (Turso vs local SQLite)—duplicate `adapterFromEnv()` in this script so `pnpm exec tsx scripts/backfill-phase1-ownership.ts` works with `--env-file=.env`.

Create **`scripts/backfill-phase1-ownership.ts`**:

```typescript
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { nanoid } from "nanoid";

function adapterFromEnv() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const isRemote = databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("libsqls://");
  if (isRemote) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    if (!authToken) throw new Error("TURSO_AUTH_TOKEN required for Turso URL");
    return new PrismaLibSql({ url: databaseUrl, authToken });
  }
  const path = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
  return new PrismaBetterSqlite3({ url: path });
}

function slugify(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 3 ? s : "newsletter";
}

async function main() {
  const clerkUserId = process.env.LEGACY_BOOTSTRAP_CLERK_USER_ID?.trim();
  if (!clerkUserId) {
    console.error("Set LEGACY_BOOTSTRAP_CLERK_USER_ID to your Clerk user id (dashboard → user).");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: adapterFromEnv() });

  const email = process.env.LEGACY_BOOTSTRAP_EMAIL?.trim() ?? null;

  const user = await prisma.user.upsert({
    where: { clerkUserId },
    create: { clerkUserId, email },
    update: email ? { email } : {},
  });

  const orphans = await prisma.newsletter.findMany({
    where: { OR: [{ userId: null }, { slug: null }] },
    select: { id: true, niche: true, slug: true },
  });

  for (const row of orphans) {
    let candidate = slugify(row.niche);
    let slug = row.slug ?? candidate;
    if (!row.slug) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const exists = await prisma.newsletter.findUnique({ where: { slug }, select: { id: true } });
        if (!exists || exists.id === row.id) break;
        slug = `${candidate}-${nanoid(6)}`;
      }
    }

    await prisma.newsletter.update({
      where: { id: row.id },
      data: { userId: user.id, slug: slug ?? `${candidate}-${nanoid(6)}` },
    });
    console.log(`Updated newsletter ${row.id} → slug ${slug}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Add **`pnpm add -D tsx`** if missing.

Package script optional:

```json
"db:backfill-phase1": "tsx scripts/backfill-phase1-ownership.ts"
```

- [ ] **Step 2: Run locally against dev DB**

Run:

```bash
LEGACY_BOOTSTRAP_CLERK_USER_ID=user_xxx pnpm db:backfill-phase1
```

Expected: logs one line per updated newsletter; no rows with null `userId`/`slug` afterward (`pnpm prisma studio` spot-check).

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-phase1-ownership.ts package.json pnpm-lock.yaml
git commit -m "chore(db): phase1 ownership backfill script"
```

---

### Task 3: Enforce NOT NULL `userId` and `slug` (optional hardening migration)

**Files:**
- Modify: `prisma/schema.prisma`
- New migration after backfill completed everywhere

- [ ] **Step 1: After production/local backfill verified**, change Prisma fields:

```prisma
userId  String
user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
slug    String @unique
```

Remove `?` from `userId` and `slug`.

- [ ] **Step 2: `pnpm prisma migrate dev --name phase1_require_owner_slug`**

If SQLite rebuild fails due to NULL remnants, fix data then rerun.

- [ ] **Step 3: Commit**

```bash
git add prisma
git commit -m "feat(db): require Newsletter userId and slug"
```

---

### Task 4: Subscribe token helpers + Vitest

**Files:**
- Create: `lib/subscribe-token.ts`
- Create: `lib/subscribe-token.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Vitest**

Run:

```bash
pnpm add -D vitest
```

Add script:

```json
"test": "vitest run"
```

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Implement `lib/subscribe-token.ts`**

```typescript
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function randomUrlToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Compare SHA-256 hex strings (64 chars) in constant time. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Write failing tests first**

`lib/subscribe-token.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { hashToken, randomUrlToken, timingSafeEqualHex } from "./subscribe-token";

describe("subscribe-token", () => {
  it("hashToken is deterministic", () => {
    const t = "hello-token";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(hashToken(t + "!"));
  });

  it("timingSafeEqualHex accepts equal hashes", () => {
    const h = hashToken("x");
    expect(timingSafeEqualHex(h, h)).toBe(true);
  });

  it("timingSafeEqualHex rejects unequal length or value", () => {
    expect(timingSafeEqualHex("abc", "abc")).toBe(false);
    const a = hashToken("a");
    const b = hashToken("b");
    expect(timingSafeEqualHex(a, b)).toBe(false);
  });

  it("randomUrlToken has entropy", () => {
    expect(randomUrlToken()).not.toBe(randomUrlToken());
  });
});
```

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts lib/subscribe-token.ts lib/subscribe-token.test.ts package.json pnpm-lock.yaml
git commit -m "test: subscribe token hashing helpers"
```

---

### Task 5: Rate limit helper for subscribe API

**Files:**
- Create: `lib/rate-limit-subscribe.ts`

- [ ] **Step 1: Implement fixed-window counters**

```typescript
type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 60_000;
const MAX_PER_IP_SLUG = 30;
const MAX_PER_EMAIL_SLUG = 10;

const store = new Map<string, Bucket>();

function prune(key: string, now: number) {
  const b = store.get(key);
  if (!b) return { count: 0, windowStart: now };
  if (now - b.windowStart > WINDOW_MS) {
    const fresh = { count: 0, windowStart: now };
    store.set(key, fresh);
    return fresh;
  }
  return b;
}

export function rateLimitSubscribeHit(key: string): boolean {
  const now = Date.now();
  const b = prune(key, now);
  b.count += 1;
  store.set(key, b);
  return b.count <= (key.includes("@") ? MAX_PER_EMAIL_SLUG : MAX_PER_IP_SLUG);
}

export function subscribeRateKeys(ip: string, slug: string, emailNormalized: string) {
  return {
    ipSlug: `${ip}|${slug}`,
    ipEmailSlug: `${ip}|${emailNormalized}|${slug}`,
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
```

Document in module header comment: **single-instance only**; use Redis/Upstash when horizontally scaled.

- [ ] **Step 2: Commit**

```bash
git add lib/rate-limit-subscribe.ts
git commit -m "feat: in-memory subscribe rate limiting"
```

---

### Task 6: Clerk packages + middleware + provider

**Files:**
- Modify: `package.json`, `app/layout.tsx`
- Create: `middleware.ts`
- Create: `app/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Install Clerk**

Run:

```bash
pnpm add @clerk/nextjs
```

- [ ] **Step 2: `middleware.ts` (project root)**

Use **explicit protected prefixes** so `/`, `/p`, `/subscribe`, `/sign-in`, `/sign-up`, and `/api/public/*` stay public without accidentally locking unknown routes later.

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/newsletter(.*)",
  "/api/newsletters(.*)",
  "/api/generate-topics",
  "/api/generate-draft",
  "/api/publish",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
```

Verify **`GET /api/public/subscribe`** is **not** matched by `isProtectedRoute` (path is `/api/public/...` — omitted — good).

- [ ] **Step 3: Wrap layout**

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newsletter AI",
  description: "Research and draft newsletters",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Sign-in/up pages**

`app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
```

`app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
```

- [ ] **Step 5: Run dev smoke**

Run:

```bash
pnpm dev
```

Visit `/sign-in` — Expected: Clerk widget renders (requires `.env.local` Clerk keys).

- [ ] **Step 6: Commit**

```bash
git add middleware.ts app/layout.tsx app/sign-in app/sign-up package.json pnpm-lock.yaml
git commit -m "feat(auth): Clerk middleware and sign-in/up routes"
```

---

### Task 7: `lib/current-user.ts` — lazy upsert Prisma `User`

**Files:**
- Create: `lib/current-user.ts`

- [ ] **Step 1: Implement helper**

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function requireInternalUserId(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const profile = await currentUser();
  const email =
    profile?.primaryEmailAddress?.emailAddress ??
    profile?.emailAddresses?.[0]?.emailAddress ??
    null;

  const user = await prisma.user.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, email },
    update: email ? { email } : {},
    select: { id: true },
  });

  return { ok: true, userId: user.id };
}
```

Adjust imports if `@clerk/nextjs/server` exports differ slightly across minor versions—follow installed package typings.

- [ ] **Step 2: Commit**

```bash
git add lib/current-user.ts
git commit -m "feat(auth): map Clerk user to Prisma User"
```

---

### Task 8: Newsletter ownership helpers

**Files:**
- Create: `lib/newsletter-owner.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function newsletterOwnedByOr404(newsletterId: string, internalUserId: string) {
  const newsletter = await prisma.newsletter.findFirst({
    where: { id: newsletterId, userId: internalUserId },
    select: {
      id: true,
      niche: true,
      mastraThreadId: true,
      status: true,
      finalDraft: true,
      slug: true,
      displayName: true,
      tagline: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!newsletter) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Newsletter not found." }, { status: 404 }),
    };
  }
  return { ok: true as const, newsletter };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/newsletter-owner.ts
git commit -m "feat(api): newsletter ownership lookup helper"
```

---

### Task 9: Guard existing APIs + extend newsletter JSON

**Files:**
- Modify: `app/api/newsletters/[id]/route.ts`
- Modify: `app/api/newsletters/[id]/topics/route.ts`
- Modify: `app/api/generate-topics/route.ts`
- Modify: `app/api/generate-draft/route.ts`
- Modify: `app/api/publish/route.ts`

Pattern at top of each handler that touches `newsletterId` from URL or body:

```typescript
import { requireInternalUserId } from "@/lib/current-user";
import { newsletterOwnedByOr404 } from "@/lib/newsletter-owner";

const authResult = await requireInternalUserId();
if (!authResult.ok) return authResult.response;

const owned = await newsletterOwnedByOr404(id, authResult.userId);
if (!owned.ok) return owned.response;
// use prisma loads as today OR reuse owned.newsletter where sufficient
```

For **`GET`** include topics via separate query still.

Extend **`GET`** JSON:

```typescript
slug: newsletter.slug,
displayName: newsletter.displayName,
tagline: newsletter.tagline,
```

**`PATCH` newsletter**: extend Zod schema optionally:

```typescript
const patchNewsletterSchema = z.object({
  finalDraft: z.string().optional(),
  displayName: z.string().max(120).optional(),
  tagline: z.string().max(280).optional(),
}).refine((b) => b.finalDraft !== undefined || b.displayName !== undefined || b.tagline !== undefined, {
  message: "At least one field required",
});
```

Update data block accordingly.

- [ ] **`generate-topics`**: after niche validated, resolve internal user; generate slug:

Use `lib/slug.ts`:

```typescript
import { nanoid } from "nanoid";

export function slugifySegment(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 3 ? s : "newsletter";
}

export async function allocateNewsletterSlug(tx: Pick<typeof prisma, "newsletter">, niche: string) {
  const base = slugifySegment(niche);
  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? base : `${base}-${nanoid(6)}`;
    const clash = await tx.newsletter.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new Error("Could not allocate slug");
}
```

Note: pass prisma transaction client — simplest inline in route without transaction first:

```typescript
let slug = slugifySegment(niche);
for (let attempt = 0; attempt < 12; attempt++) {
  const exists = await prisma.newsletter.findUnique({ where: { slug }, select: { id: true } });
  if (!exists) break;
  slug = `${slugifySegment(niche)}-${nanoid(6)}`;
}

await prisma.newsletter.create({
  data: {
    niche,
    mastraThreadId: threadId,
    userId: authResult.userId,
    slug,
    displayName: niche,
  },
});
```

- [ ] **Step 2: Run TypeScript**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/newsletters app/api/generate-topics/route.ts app/api/generate-draft/route.ts app/api/publish/route.ts lib/slug.ts
git commit -m "feat(api): enforce newsletter ownership and slugs"
```

---

### Task 10: Move creator UI under `/dashboard` + update `/`

**Files:**
- Move: `app/newsletter/[id]/topics/page.tsx` → `app/dashboard/newsletter/[id]/topics/page.tsx`
- Move: `app/newsletter/[id]/topics/topics-editor.tsx` → same subtree
- Move: draft equivalents similarly
- Modify imports/links (`/newsletter/` → `/dashboard/newsletter/`)
- Modify: `app/home-form.tsx` redirect targets
- Modify: `app/page.tsx` — marketing + Clerk `SignedIn` / `SignedOut` buttons

Example **`app/page.tsx`** skeleton:

```tsx
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Newsletter AI</h1>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <SignedOut>
        <p className="text-zinc-600">Sign in to create newsletters.</p>
        <Link href="/sign-in" className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <Link href="/dashboard" className="text-zinc-900 underline dark:text-zinc-100">
          Go to dashboard
        </Link>
      </SignedIn>
    </main>
  );
}
```

Create **`app/dashboard/page.tsx`** embedding niche form component moved from old home OR reuse `home-form` with prop `redirectBase="/dashboard/newsletter"`:

Update **`home-form.tsx`**:

```typescript
router.push(`/dashboard/newsletter/${data.newsletterId}/topics`);
```

- [ ] **Step 2: Remove obsolete `app/newsletter` tree** after files moved.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard app/page.tsx app/home-form.tsx
git rm -r app/newsletter  # if applicable
git commit -m "feat(ui): dashboard routes for authenticated newsletter flow"
```

---

### Task 11: Public landing `/p/[slug]` + subscribe form

**Files:**
- Create: `app/p/[slug]/page.tsx`
- Create: `app/p/[slug]/subscribe-form.tsx`

`page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "./subscribe-form";

export default async function PublicNewsletterPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      displayName: true,
      tagline: true,
      niche: true,
    },
  });
  if (!newsletter) notFound();

  const title = newsletter.displayName ?? newsletter.niche;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {newsletter.tagline ? <p className="text-zinc-600 dark:text-zinc-400">{newsletter.tagline}</p> : null}
      </header>
      <SubscribeForm slug={newsletter.slug!} />
    </main>
  );
}
```

`subscribe-form.tsx`:

```tsx
"use client";

import { useState } from "react";

export function SubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setStatus("done");
      setMessage(typeof data.message === "string" ? data.message : "Check your email.");
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="text-sm font-medium">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {status === "loading" ? "Submitting…" : "Subscribe"}
      </button>
      {message ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/p
git commit -m "feat(ui): public newsletter landing and subscribe form"
```

---

### Task 12: `POST /api/public/subscribe`

**Files:**
- Create: `lib/subscribe-email.ts`
- Create: `app/api/public/subscribe/route.ts`

`lib/subscribe-email.ts`:

```typescript
const RESEND_SEND_URL = "https://api.resend.com/emails";

export function confirmationLink(token: string): string {
  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  if (!base) throw new Error("APP_URL is required for confirmation links");
  const url = new URL("/subscribe/confirm", base);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendSubscribeConfirmationEmail(params: {
  to: string;
  newsletterTitle: string;
  confirmUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return false;

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Confirm subscription — ${params.newsletterTitle}`,
      text: `Confirm your subscription to "${params.newsletterTitle}".\n\n${params.confirmUrl}\n`,
    }),
  });

  return response.ok;
}
```

`app/api/public/subscribe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimitSubscribeHit, subscribeRateKeys } from "@/lib/rate-limit-subscribe";
import { confirmationLink, sendSubscribeConfirmationEmail } from "@/lib/subscribe-email";
import { hashToken, randomUrlToken } from "@/lib/subscribe-token";

const bodySchema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
});

const CONFIRM_HOURS = 48;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or slug." }, { status: 400 });
  }

  const slug = parsed.data.slug.trim();
  const emailNormalized = parsed.data.email.trim().toLowerCase();

  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: { id: true, displayName: true, niche: true },
  });

  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const keys = subscribeRateKeys(ip, slug, emailNormalized);
  if (!rateLimitSubscribeHit(keys.ipSlug) || !rateLimitSubscribeHit(keys.ipEmailSlug)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const generic = {
    message:
      "If this address can receive mail, we sent a confirmation link. Please check your inbox.",
  };

  const existing = await prisma.subscriber.findUnique({
    where: {
      newsletterId_emailNormalized: {
        newsletterId: newsletter.id,
        emailNormalized,
      },
    },
    select: { status: true },
  });

  if (existing?.status === "active") {
    return NextResponse.json(generic);
  }

  const plainToken = randomUrlToken();
  const tokenHash = hashToken(plainToken);
  const confirmationExpiresAt = new Date(Date.now() + CONFIRM_HOURS * 60 * 60 * 1000);

  await prisma.subscriber.upsert({
    where: {
      newsletterId_emailNormalized: {
        newsletterId: newsletter.id,
        emailNormalized,
      },
    },
    create: {
      newsletterId: newsletter.id,
      emailNormalized,
      status: "pending",
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt,
    },
    update: {
      status: "pending",
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt,
      confirmedAt: null,
    },
  });

  let confirmUrl: string;
  try {
    confirmUrl = confirmationLink(plainToken);
  } catch {
    console.error("[subscribe] APP_URL missing");
    return NextResponse.json({ error: "Subscribe is not configured on this server." }, { status: 503 });
  }

  const title = newsletter.displayName ?? newsletter.niche;
  const sent = await sendSubscribeConfirmationEmail({
    to: parsed.data.email.trim(),
    newsletterTitle: title,
    confirmUrl,
  });

  if (!sent) {
    console.error("[subscribe] confirmation email failed");
  }

  return NextResponse.json(generic);
}
```

**Note:** Anti-enumeration: **`active`** returns **200** with generic message **without** sending email again.

- [ ] **Step 2: Commit**

```bash
git add lib/subscribe-email.ts app/api/public/subscribe/route.ts
git commit -m "feat(api): public subscribe with double opt-in email"
```

---

### Task 13: Confirm route + success/error pages

**Files:**
- Create: `app/subscribe/confirm/route.ts`
- Create: `app/subscribe/success/page.tsx`
- Create: `app/subscribe/error/page.tsx`

`app/subscribe/confirm/route.ts`:

Lookup subscriber **by stored hash** (`confirmationTokenHash === SHA-256(token)`)—indexed equality lookup, no table scan over pending rows.

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, timingSafeEqualHex } from "@/lib/subscribe-token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const fail = NextResponse.redirect(new URL("/subscribe/error", req.url));
  const ok = NextResponse.redirect(new URL("/subscribe/success", req.url));

  if (!token.trim()) return fail;

  const tokenHash = hashToken(token);

  const match = await prisma.subscriber.findFirst({
    where: { confirmationTokenHash: tokenHash },
    select: {
      id: true,
      status: true,
      confirmationExpiresAt: true,
      confirmationTokenHash: true,
    },
  });

  if (!match?.confirmationTokenHash) return fail;

  if (!timingSafeEqualHex(match.confirmationTokenHash, tokenHash)) return fail;

  if (match.status === "active") return ok;

  if (match.status !== "pending") return fail;

  if (!match.confirmationExpiresAt || match.confirmationExpiresAt.getTime() < Date.now()) {
    return fail;
  }

  await prisma.subscriber.update({
    where: { id: match.id },
    data: {
      status: "active",
      confirmedAt: new Date(),
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
    },
  });

  return ok;
}
```

Optional later: Prisma `@@index([confirmationTokenHash])` if query plans warrant it.

`success/page.tsx`:

```tsx
export default function SubscribeSuccessPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">You are subscribed</h1>
      <p className="mt-2 text-zinc-600">Thanks — you can close this tab.</p>
    </main>
  );
}
```

`error/page.tsx`:

```tsx
export default function SubscribeErrorPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">Link invalid or expired</h1>
      <p className="mt-2 text-zinc-600">Request a new confirmation email from the newsletter page.</p>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/subscribe
git commit -m "feat(ui): subscribe confirmation redirects"
```

---

### Task 14: Dashboard newsletter index + polish

**Files:**
- Modify: `app/dashboard/page.tsx` — list `prisma.newsletter.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }})` server component using **`auth()` + prisma`** pattern:

```tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HomeForm } from "@/app/home-form";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const internal = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!internal) redirect("/sign-in");

  const newsletters = await prisma.newsletter.findMany({
    where: { userId: internal.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, niche: true, slug: true, status: true, updatedAt: true },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your newsletters</h2>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {newsletters.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{n.niche}</p>
                <p className="text-xs text-zinc-500">{n.slug ? `/p/${n.slug}` : "missing slug"}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/dashboard/newsletter/${n.id}/topics`} className="underline">
                  Edit
                </Link>
                {n.slug ? (
                  <Link href={`/p/${n.slug}`} className="underline" target="_blank">
                    Public page
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Create another</h2>
        <HomeForm />
      </section>
    </main>
  );
}
```

Ensure **`HomeForm`** only renders client chunk — acceptable mix.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(ui): dashboard newsletter list and create form"
```

---

### Task 15: `.env.example` + docs + verification

**Files:**
- Modify: `.env.example`

Append:

```bash
# ─── Clerk ─────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
# Optional webhook secret if using Clerk webhooks later:
# CLERK_WEBHOOK_SECRET="whsec_..."

# ─── App URLs ───────────────────────────────────────────────────────────────────
APP_URL="http://localhost:3000"
```

- [ ] **Step 2: Verification**

Run:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run build
pnpm exec eslint app/dashboard app/p app/subscribe app/api/public middleware.ts lib/current-user.ts lib/newsletter-owner.ts lib/subscribe-email.ts lib/rate-limit-subscribe.ts lib/slug.ts
```

Expected: tests pass; build succeeds; lint clean on touched paths.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): Clerk and APP_URL for phase1"
```

---

## Plan self-review

**Spec coverage**

| Spec section | Tasks |
|----------------|-------|
| User model + Clerk | Tasks 1, 6–7 |
| Newsletter `userId`/`slug`/landing fields | Tasks 1–3, 9–11 |
| Subscriber + double opt-in | Tasks 1, 12–13 |
| Public `/p/[slug]` | Task 11 |
| Middleware boundaries | Task 6 |
| Ownership on APIs | Tasks 8–9 |
| Rate limiting | Task 5 + Task 12 |
| Resend confirmation | Tasks 12–13 |
| env docs | Task 15 |
| Legacy migration/backfill | Tasks 2–3 |

**Placeholder scan:** None intentional.

**Type/name consistency:** Prisma compound unique `newsletterId_emailNormalized` matches Task 12 `upsert` where clause.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-30-newsletter-multi-tenant-phase1-plan.md`. Two execution options:**

1. **Subagent-driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration (`superpowers:subagent-driven-development`).

2. **Inline execution** — Run tasks in this session using batches and checkpoints (`superpowers:executing-plans`).

**Which approach do you want?**
