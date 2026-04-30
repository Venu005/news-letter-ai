import { Mastra } from '@mastra/core';
import { memory } from './memory';
import { searchAgent } from './agents/search';
import { writerAgent } from './agents/writer';
import { editorAgent } from './agents/editor';

export const mastra = new Mastra({
    memory: memory,
    agents: { searchAgent, writerAgent, editorAgent }
});
