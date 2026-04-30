import { Memory } from '@mastra/memory';
import { LibSQL } from '@mastra/libsql';

export const memory = new Memory({
  storage: new LibSQL({ url: 'file:mastra-memory.db' })
});
