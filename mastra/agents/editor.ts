import { Agent } from "@mastra/core/agent";
import { memory } from "../memory";

export const editorAgent = new Agent({
  id: "editorAgent",
  name: "Editor Agent",
  description:
    "Supervises the Writer Agent draft for tone, clarity, formatting, and citation hygiene.",
  instructions: `You are a strict supervising editor.

Given the Writer Agent draft (provided in the latest user message when invoked), revise it into publication-ready Markdown:
- Preserve factual meaning and URLs; do not add new facts or links not already present.
- Improve tone (confident, concise), tighten wording, fix headings hierarchy, remove redundancy.
- Ensure citations remain Markdown links using existing URLs only.
- Output ONLY the final Markdown (no commentary).`,
  model: "openai/gpt-4o-mini",
  memory,
});
