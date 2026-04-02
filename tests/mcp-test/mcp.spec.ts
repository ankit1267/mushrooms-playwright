import { test, expect } from '@playwright/test';
import { createMcpClient } from '../../utils/mcpClient';
import { CREATE_ROW_TOOL, getMcpToolNames, MCP_URL } from './toolList';

test('MCP connects', async () => {
  const client = await createMcpClient(MCP_URL);
  expect(client).toBeDefined();
});

test('MCP lists tools', async () => {
  const client = await createMcpClient(MCP_URL);

  const tools = await client.listTools();
  console.log("tools", tools);

  expect(tools.tools.length).toBeGreaterThan(0);
});

test('Specific tool exists', async () => {
  const client = await createMcpClient(MCP_URL);

  const names = await getMcpToolNames(client);
  console.log("names", names);

  expect(names).toContain(CREATE_ROW_TOOL);
  
});

test('Tool executes', async () => {
  const client = await createMcpClient(MCP_URL);

  const result = await client.callTool({
    name: CREATE_ROW_TOOL,
    arguments: {}
  });
  console.log("result", result);
  expect(result).toBeDefined();


});

test('Tool works multiple times (stability)', async () => {
  const client = await createMcpClient(MCP_URL);

  for (let i = 0; i < 3; i++) {
    const result = await client.callTool({
      name: CREATE_ROW_TOOL,
      arguments: {}
    });
    console.log("result", result);
    expect(result).toBeDefined();


  }
});

