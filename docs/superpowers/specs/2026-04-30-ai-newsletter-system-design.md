# AI-Powered Newsletter Orchestration System

## 1. Overview
An end-to-end web application that allows users to generate, review, and publish AI-crafted newsletters for specific niches. The system heavily leverages Mastra for agent orchestration and Human-in-the-Loop (HITL) interventions.

## 2. Architecture & Data Flow

### The "UI-Driven Modular Agents" Approach
State is maintained by the Next.js frontend, while continuous context for the AI is preserved using Mastra's built-in Memory system (via Thread IDs). 

**Step-by-Step Flow:**
1. **Topic Generation:** User enters a niche. The frontend generates a unique `threadId` and calls the **Search Agent** (`POST /api/generate-topics`).
2. **Review 1 (HITL):** The Search Agent returns an array of topics. The UI displays them. The user edits or approves the topics.
3. **Drafting:** The user clicks "Generate Draft". The frontend calls the **Writer Agent** (`POST /api/generate-draft`), passing the *approved* topics as prompt context and using the *same* `threadId` from step 1.
4. **Supervision:** The backend automatically routes the Writer Agent's draft to the **Editor Agent** (Supervisor) to refine the copy against quality guidelines.
5. **Review 2 (HITL):** The finalized draft is sent back to the frontend and displayed in a rich text editor for final user tweaks.
6. **Publishing:** The user clicks "Publish". The frontend triggers `POST /api/publish` to send the content to an external provider (e.g., Resend or Mailchimp).

## 3. Mastra Agents

1. **Search Agent:** 
   - **Tools:** Web Search tool.
   - **Instructions:** Find the latest news and trends in a given niche. Output a structured JSON array of topics.
2. **Writer Agent:** 
   - **Instructions:** Write engaging, well-formatted newsletters. It receives the approved topics from the user and can reference the raw research via the shared Memory `threadId`.
3. **Editor Agent:** 
   - **Instructions:** Act as a strict supervisor. Review the Writer Agent's draft for tone, formatting, and brevity. Output the final markdown or HTML.

## 4. Frontend Components (Next.js)

- **Setup View:** A form taking the niche input.
- **Outline Editor:** A list interface where users can edit/add/delete topics.
- **Review & Publish View:** A rich text/Markdown editor displaying the final draft with a "Publish" button.

## 5. Storage & Context
- **AI Context Memory:** Mastra Memory (e.g. LibSQL) to persist conversation turns for the specific `threadId`.
- **Application State:** State for topics and drafts will be held in React state during the session.
