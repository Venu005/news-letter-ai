# Streaming Research Page

**Date:** 2026-05-21

## Summary

Replace the current blocking research flow (spinner for 30+ seconds while the agent runs) with a dedicated streaming research page. Users navigate to a new page after clicking "Start research" where they see the agent's steps unfold in real-time — search queries, article scrapes, and reasoning — in a chat-style log. When research completes, a "View Topics" button navigates to the existing topics editor.

## Architecture

Two changes: (1) the research API becomes a streaming SSE endpoint, (2) a new frontend page renders the stream as a chat-style log.

Instead of `agent.generate()` (blocking), the API uses `agent.stream()` + `fullStream` to get event-level chunks (tool calls, tool results, text). These are serialized as SSE events and consumed by a React client component.

```
POST /api/newsletters/[id]/issues
  → Issue created in DB
  → agent.stream() with Mastra thread memory
  → for each chunk in stream.fullStream:
      → SSE event sent to client
  → when stream ends:
      → parse agent's final JSON output
      → bulk-create Topic rows
      → SSE "done" event with issueId + topicCount
```

New route:

```
/dashboard/newsletter/[id]/issue/[issueId]/research   ← NEW
```

Navigation flow becomes 4 steps: Research → Topics → Draft → Publish.

## Backend: Streaming API

### Endpoint

`POST /api/newsletters/[id]/issues` — same path, different behavior.

**Request:** `{ niche: string }` (unchanged)

**Response:** `text/event-stream` with these events:

| Event | Data | When |
|-------|------|------|
| `step` | `{ type: "tool-call", tool: "google-news-search", input: { query: string } }` | Agent calls a tool |
| `step` | `{ type: "tool-result", tool: "google-news-search", output: { query, results: [...] } }` | Tool returns |
| `step` | `{ type: "text", content: string }` | Agent outputs reasoning text |
| `done` | `{ issueId: string, threadId: string, topicCount: number }` | Research complete, topics created |
| `error` | `{ message: string }` | Agent or tool fails |

### Implementation

Uses `agent.stream()` instead of `agent.generate()`. The `stream.fullStream` yields chunk objects. Each chunk is inspected for tool calls (`chunk.type === "tool-call"`), tool results (`chunk.type === "tool-result"`), or text deltas (`chunk.type === "text-delta"`). These are serialized as SSE events.

On stream completion, the accumulated text is parsed via `parseTopicsJson()` and topics are created. The thread memory is preserved (same `mastraThreadId`) so the writer agent can pick up context later.

The agent config (`maxSteps: 24`, `memory`, `tools`) is unchanged.

## Frontend: Research Page

### Route

`/dashboard/newsletter/[id]/issue/[issueId]/research`

### Page Structure

- `page.tsx` — server component, prefetches issue data
- `research-stream.tsx` — client component with SSE connection + rendering

### ResearchStream Client Component

**State:**
- `steps: Step[]` — accumulated list of agent steps
- `status: "connecting" | "streaming" | "done" | "error"`
- `finalResult: { issueId, topicCount } | null`

**Connection:**
1. `useEffect` on mount creates `fetch()` to the SSE endpoint
2. `response.body.getReader()` reads the stream
3. Text decoder splits on `\n\n` to parse SSE events
4. Each `step` event appends to `steps[]`; `done` event sets status and finalResult
5. `error` event or fetch failure sets error status
6. `AbortController` on unmount cancels the fetch

**Rendering:**
- Each `Step` is rendered as a message card:
  - **tool-call:** Icon + tool name + input display (e.g., "🔍 google-news-search: 'renewable energy 2026'") — subdued styling
  - **tool-result:** Summary of results (e.g., "Found 8 articles") with expandable detail
  - **text:** Rendered as markdown using `Streamdown` component — chat-bubble styling
  - **done:** Green success banner with "Research complete ✅" and "View Topics →" button
- Auto-scroll: container scrolls to bottom on each new step (via `useEffect` + `scrollIntoView`)
- Loading: animated dots while status is "connecting"
- Error: red alert with error message and "Try again" button

**Navigation:**
- On `done`, a "View Topics →" button appears → `router.push(.../topics)`
- A back link navigates to the newsletter detail page

### Stepper Update

`IssueStepper` component updated to show 4 steps: Research → Topics → Draft → Publish.

Step 1 (Research) is the current/active step when status is `RESEARCHING`. Clicking it navigates to the research page.

### Existing Page Changes

| File | Change |
|------|--------|
| `create-article-form.tsx` | Navigate to `.../research` instead of `.../topics` after mutation success |
| `issues-list.tsx` | `RESEARCHING` status links to research page instead of topics page |

## Research Agent Changes

None. The search agent configuration (`tools`, `instructions`, `model`, `memory`) is unchanged. Only the invocation method changes: `agent.stream()` instead of `agent.generate()`.

The `maxSteps: 24` option is passed to `agent.stream()` the same way it is to `agent.generate()`.

## Testing Strategy

- Unit test: SSE event serialization/parsing
- Integration: start dev server, trigger research, verify events arrive in order, verify topics are created on completion
- Manual: click "Start research", watch the stream, click "View Topics", verify topics are populated

## Edge Cases

- **Agent fails mid-stream:** Error event sent, thread memory preserved with partial work
- **Client disconnects:** Agent continues running (Mastra thread persists), issue stays in `RESEARCHING` status
- **No articles found:** Agent returns empty array, 0 topics created, done event with `topicCount: 0`
- **SSE connection timeout:** Browser automatically retries (EventSource reconnect), but we use `fetch` + manual parsing with a 5-minute timeout
- **Multiple rapid clicks:** Debounce the "Start research" button in `create-article-form.tsx` (already prevented by `isPending` state in `useMutation`)

## Files Changed

| File | Change |
|------|--------|
| `app/api/newsletters/[id]/issues/route.ts` | Rewrite: streaming SSE, agent.stream(), parse on finish |
| `app/dashboard/newsletter/[id]/issue/[issueId]/research/page.tsx` | **New** — server page |
| `app/dashboard/newsletter/[id]/issue/[issueId]/research/research-stream.tsx` | **New** — client SSE component |
| `app/dashboard/newsletter/[id]/create-article-form.tsx` | Navigation target: topics → research |
| `app/dashboard/newsletter/[id]/issues-list.tsx` | Link target: topics → research for RESEARCHING |
| `components/dashboard/issue-stepper.tsx` | 3 steps → 4 steps |

## Files Not Changed

- `mastra/agents/search.ts` — unchanged
- `mastra/tools/` — unchanged
- `mastra/lib/topics-json.ts` — unchanged
- `prisma/schema.prisma` — unchanged
- `app/api/issues/[id]/draft/route.ts` — unchanged
- `app/dashboard/.../topics/` — unchanged
- `app/dashboard/.../draft/` — unchanged
