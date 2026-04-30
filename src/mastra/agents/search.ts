import { Agent } from '@mastra/core/agent';

export const searchAgent = new Agent({
    name: 'Search Agent',
    instructions: 'Find the latest news and trends in a given niche. Output a structured JSON array of topics, AND save the raw content/summaries and URLs of the articles found to Memory.',
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o',
    }
});
