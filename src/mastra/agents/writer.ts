import { Agent } from '@mastra/core/agent';

export const writerAgent = new Agent({
    name: 'Writer Agent',
    instructions: 'Write engaging, well-formatted newsletters.\nAnti-Hallucination Constraints:\n- Strict Context Injection: Must ONLY use the raw article content provided by the Search Agent in the shared Memory threadId. Do not invent facts.\n- Mandatory Citations: Every factual claim must include a markdown link referencing the exact URL from the research.',
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o',
    }
});
