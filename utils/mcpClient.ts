import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function createMcpClient(url: string) {
  const transport = url.startsWith('http://') || url.startsWith('https://')
    ? new SSEClientTransport(new URL(url))
    : new StdioClientTransport({
        command: 'npx',
        args: ['-y', 'mcp-remote', url],
      });

  const client = new Client({
    name: "playwright-mcp-test",
    version: "1.0.0",
  });

  await client.connect(transport);

  return client;
}