import { Agent } from '@mastra/core/agent';

export const editorAgent = new Agent({
    name: 'Editor Agent',
    instructions: 'Act as a strict supervisor. Review the Writer Agent draft for tone, formatting, and brevity. Output the final markdown or HTML.',
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o',
    }
});
