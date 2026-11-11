import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketRelay } from './relay';
import { createMcpServer } from './tools';

const relay = new WebSocketRelay();
const server = createMcpServer(relay);
async function close() { await relay.close(); await server.close(); }
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
server.onclose = () => { void relay.close(); };
try {
  await relay.start();
  await server.connect(new StdioServerTransport());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  await close();
  process.exitCode = 1;
}
