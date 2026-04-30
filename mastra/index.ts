import { Mastra } from "@mastra/core";
import { editorAgent } from "./agents/editor";
import { searchAgent } from "./agents/search";
import { writerAgent } from "./agents/writer";
import { memory } from "./memory";

export const mastra = new Mastra({
  agents: { searchAgent, writerAgent, editorAgent },
  memory: { default: memory },
});
