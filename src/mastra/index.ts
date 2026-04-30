import { Mastra } from '@mastra/core';
import { memory } from './memory';

export const mastra = new Mastra({
    memory: memory,
    agents: {}
});
