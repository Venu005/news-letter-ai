# AI Newsletter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end Next.js application that orchestrates Mastra AI agents to generate, review, and publish newsletters, utilizing Prisma to persist the application state and Mastra Memory to persist the AI context.

**Architecture:** We use a Next.js App Router frontend to manage the state and UI. The backend uses Prisma (SQLite) to store `Newsletters` and `Topics`. Mastra orchestrates three agents (Search, Writer, Editor) sharing context via Mastra Memory (LibSQL). The UI fetches topics, saves them to Prisma, passes approved topics to the Writer Agent, and allows publishing.

**Tech Stack:** Next.js (App Router), Prisma ORM (SQLite), Mastra, LibSQL (Memory), Tailwind CSS, Node.js test runner.

---
### Task 1: Initialize Prisma ORM and Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Install Prisma dependencies**

Run: `npm i prisma --save-dev && npm i @prisma/client`

- [ ] **Step 2: Initialize Prisma with SQLite**

Run: `npx prisma init --datasource-provider sqlite`

- [ ] **Step 3: Define the schema**

Modify `prisma/schema.prisma` to include the `Newsletter` and `Topic` models.
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Newsletter {
  id             String   @id @default(uuid())
  niche          String
  mastraThreadId String   @unique
  status         String   @default("RESEARCHING") // RESEARCHING, DRAFTING, REVIEWING, PUBLISHED
  finalDraft     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  topics         Topic[]
}

model Topic {
  id           String     @id @default(uuid())
  title        String
  summary      String
  sourceUrl    String
  isApproved   Boolean    @default(true)
  newsletterId String
  newsletter   Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Generate client and migrate database**

Run: `npx prisma migrate dev --name init_newsletter_schema`
Expected output: Migration successful, Prisma client generated.

- [ ] **Step 5: Create a Prisma client singleton**

Create `src/lib/prisma.ts`:
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/prisma.ts package.json package-lock.json .env
git commit -m "feat(db): initialize Prisma and schema"
```

---
### Task 2: Initialize Mastra and Memory Configuration

**Files:**
- Create: `src/mastra/memory.ts`
- Modify: `src/mastra/index.ts`

- [ ] **Step 1: Write memory implementation**

```typescript
// src/mastra/memory.ts
import { Memory } from '@mastra/memory';
export const memory = new Memory();
```

- [ ] **Step 2: Register memory in Mastra core**

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core';
import { memory } from './memory.js';

export const mastra = new Mastra({
    memory: { default: memory },
    agents: {}
});
```

- [ ] **Step 3: Commit**

```bash
git add src/mastra/memory.ts src/mastra/index.ts
git commit -m "feat(mastra): initialize memory for agents"
```

---
### Task 3: Create Search Agent

**Files:**
- Create: `src/mastra/agents/search.ts`
- Modify: `src/mastra/index.ts`

- [ ] **Step 1: Write implementation**

```typescript
// src/mastra/agents/search.ts
import { Agent } from '@mastra/core/agent';

export const searchAgent = new Agent({
    name: 'Search Agent',
    instructions: 'Find the latest news and trends in a given niche. Output a structured JSON array of topics, AND save the raw content/summaries and URLs of the articles found to Memory.',
    model: 'openai/gpt-4o'
});
```

- [ ] **Step 2: Register Agent in index.ts**

Update `src/mastra/index.ts` to include `searchAgent` in the `agents` object.

- [ ] **Step 3: Commit**

```bash
git add src/mastra/agents/search.ts src/mastra/index.ts
git commit -m "feat(agents): add search agent"
```

---
### Task 4: Create Writer and Editor Agents

**Files:**
- Create: `src/mastra/agents/writer.ts`
- Create: `src/mastra/agents/editor.ts`
- Modify: `src/mastra/index.ts`

- [ ] **Step 1: Write Writer Agent implementation**

```typescript
// src/mastra/agents/writer.ts
import { Agent } from '@mastra/core/agent';

export const writerAgent = new Agent({
    name: 'Writer Agent',
    instructions: 'Write engaging, well-formatted newsletters.\nAnti-Hallucination Constraints:\n- Strict Context Injection: Must ONLY use the raw article content provided by the Search Agent in the shared Memory threadId. Do not invent facts.\n- Mandatory Citations: Every factual claim must include a markdown link referencing the exact URL from the research.',
    model: 'openai/gpt-4o'
});
```

- [ ] **Step 2: Write Editor Agent implementation**

```typescript
// src/mastra/agents/editor.ts
import { Agent } from '@mastra/core/agent';

export const editorAgent = new Agent({
    name: 'Editor Agent',
    instructions: 'Act as a strict supervisor. Review the Writer Agent draft for tone, formatting, and brevity. Output the final markdown or HTML.',
    model: 'openai/gpt-4o'
});
```

- [ ] **Step 3: Register Agents in index.ts**

Update `src/mastra/index.ts` to include `writerAgent` and `editorAgent` in the `agents` object.

- [ ] **Step 4: Commit**

```bash
git add src/mastra/agents/writer.ts src/mastra/agents/editor.ts src/mastra/index.ts
git commit -m "feat(agents): add writer and editor agents"
```

---
### Task 5: API Routes for Next.js

**Files:**
- Create: `app/api/generate-topics/route.ts`
- Create: `app/api/generate-draft/route.ts`

- [ ] **Step 1: Topic Generation API (Prisma + Mastra)**

```typescript
// app/api/generate-topics/route.ts
import { NextResponse } from 'next/server';
import { mastra } from '@/mastra/index';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
    const { niche } = await req.json();
    const threadId = randomUUID();
    
    // Create DB record
    const newsletter = await prisma.newsletter.create({
        data: { niche, mastraThreadId: threadId }
    });

    const agent = mastra.getAgent('searchAgent');
    // Implement agent execution and topic extraction here
    
    return NextResponse.json({ newsletterId: newsletter.id, topics: [] });
}
```

- [ ] **Step 2: Draft Generation API**

```typescript
// app/api/generate-draft/route.ts
import { NextResponse } from 'next/server';
import { mastra } from '@/mastra/index';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const { newsletterId } = await req.json();
    
    // Fetch approved topics
    const topics = await prisma.topic.findMany({
        where: { newsletterId, isApproved: true }
    });
    const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } });

    const writer = mastra.getAgent('writerAgent');
    const editor = mastra.getAgent('editorAgent');
    
    // Pass topics as prompt and newsletter.mastraThreadId to the agent.
    return NextResponse.json({ draft: "# Placeholder Draft" });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-topics/route.ts app/api/generate-draft/route.ts
git commit -m "feat(api): add boilerplate endpoints integrated with prisma"
```
