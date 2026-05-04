# TanStack Query, server hydration, and Suspense (App Router)

## 1. Purpose

Adopt **TanStack Query** for client-side fetching and mutations against existing **`/api/*`** routes, use **`useSuspenseQuery`** where reads should block a UI segment, and use **server prefetch + `HydrationBoundary`** so the client cache matches the first paint for the same data (option **B** from design discussion).

This complements the current stack (**Next.js App Router**, **React 19**, **Server Components** + **Prisma** for simple reads). It does **not** require moving every read to the client.

## 2. Scope

**In scope**

- A client **`QueryClientProvider`** (or equivalent `Providers` wrapper) with sensible defaults (`staleTime`, `retry`, etc.).
- **Shared query key factories** and optional **prefetch helpers** used from both server and client so keys cannot drift.
- **Per-request `QueryClient`** on the server for prefetch/dehydrate; **new `QueryClient` per browser app instance** via `useState(() => new QueryClient())` in the provider (avoid leaking cache across users or HMR quirks).
- **`HydrationBoundary`** + **`dehydrate`** on routes where the server can prefetch the same queries the client will run immediately.
- **Reads:** `useSuspenseQuery` inside client components, wrapped by **`Suspense`** boundaries with deliberate fallbacks (skeletons or existing spinner patterns).
- **Writes:** `useMutation` with **`invalidateQueries`** and/or **`setQueryData`** after success; mutations **do not** use Suspense.
- **Errors:** Rely on **React error boundaries** (segment `error.tsx` and/or a small client `QueryErrorBoundary`) for thrown query errors from suspense queries.

**Out of scope (initial rollout)**

- Replacing all Prisma-in-RSC reads with client queries (e.g. dashboard list can stay RSC-only until there is a product reason to unify cache).
- Full-graph “one pattern everywhere” without incremental adoption.

## 3. Architecture

### 3.1 Division of responsibility

| Concern | Pattern |
| --- | --- |
| Simple list/read, no client refetch loop | Keep **Server Component** + **Prisma** (or server `fetch`). |
| Interactive editor, refetch after mutation, or repeated client reads | **Client component** + TanStack Query (`useSuspenseQuery` / `useMutation`). |
| First paint must match server-fetched data for those queries | **Prefetch** in a Server Component, then **`HydrationBoundary`** around the client subtree. |

### 3.2 Rollout

Introduce provider + key helpers first, then migrate **one route at a time** (recommended order: newsletter detail / topics flow, then draft), reusing keys and prefetch helpers as screens share entities (`newsletterId`, topics, draft).

### 3.3 Suspense boundaries

Place **`Suspense`** at **meaningful layout boundaries** (e.g. page section or editor shell), not a single root boundary for the entire app, so unrelated UI keeps rendering when possible.

## 4. Data flow

1. **Server (optional prefetch):** Build a request-scoped `QueryClient`, run `prefetchQuery` (or shared helper) with the same **query key** and compatible **queryFn** as the client.
2. **HTML response:** Pass **`dehydrate(queryClient)`** into **`HydrationBoundary`** wrapping client children.
3. **Client:** `useSuspenseQuery` with the same key; initial data is served from the hydrated cache (no duplicate network for that data on first load when prefetch succeeded).
4. **After mutation:** Invalidate affected keys (e.g. newsletter + topics) or update cache with `setQueryData` for optimistic or snappier UX.

**Query functions** should remain thin wrappers around `fetch('/api/...')` (or shared `api` module), with types aligned to existing API JSON shapes.

## 5. Error handling

- **`useSuspenseQuery`** errors propagate to the nearest error boundary; ensure **segment `error.tsx`** or a dedicated boundary wraps suspense query subtrees.
- Preserve user-facing **alerts** for mutation failures where the product already uses inline `Alert` components; those map naturally to **`onError`** on mutations or derived error state.

## 6. Testing

- Unit-test **query key builders** and small **queryFn** helpers (mock `fetch` or inject a test client).
- Add integration coverage for critical flows (load → mutate → cache invalidation) when the project’s test harness supports it; not mandatory for the first migrated route.

## 7. Dependencies

Add **`@tanstack/react-query`** (and ensure **React 19**-compatible version per lockfile at implementation time). No change to Mastra or Prisma responsibilities beyond optionally duplicating read logic in prefetch `queryFn` that mirrors API behavior—prefer **prefetch via the same HTTP API** where feasible to avoid two sources of truth, accepting the cost of an internal request from the server, **or** document when prefetch uses Prisma directly and must stay in sync with the route handler.

## 8. Success criteria

- Client islands that today use **`useEffect` + `fetch` + local loading state** can be expressed as queries/mutations with consistent cache updates.
- At least one **hydrated** route demonstrates **no redundant client fetch** for prefetched keys on first load.
- **Suspense** fallbacks replace ad-hoc loading UI for those reads where `useSuspenseQuery` is adopted.
- No regression in auth or navigation; **Clerk** and existing layouts remain unchanged except for provider placement.

## 9. Relation to existing specs

This document refines **frontend data loading** for the product described in `2026-04-30-ai-newsletter-system-design.md`. It supersedes ad-hoc “state held only in React state during the session” for the migrated surfaces by introducing a **normalized async cache** for server-backed data, while **AI thread / Mastra memory** behavior remains as in that spec.
