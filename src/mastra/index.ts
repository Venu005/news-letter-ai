import { Mastra } from '@mastra/core';
import { memory } from './memory';
import { searchAgent } from './agents/search';

export const mastra = new Mastra({
    memory: memory,
    agents: { searchAgent }
});
