import { test, expect } from '../../fixtures/base.fixture';
import { createMcpClient } from '../../utils/mcpClient';
import { CREATE_ROW_TOOL, getMcpToolNames } from './toolList';

async function resolveMcpUrl(clusterPage: { gotoClusterOneAndCopyMcpEndpointUrl: () => Promise<string> }): Promise<string> {
  return clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();
}

test('MCP connects', async ({ clusterPage }) => {
  const mcpUrl = await resolveMcpUrl(clusterPage);
  const handle = await createMcpClient(mcpUrl);
  try {
    console.log('client', handle.client);
    expect(handle.client).toBeDefined();
  } finally {
    await handle.close();
  }
});

test('MCP lists tools', async ({ clusterPage }) => {
  const mcpUrl = await resolveMcpUrl(clusterPage);
  const handle = await createMcpClient(mcpUrl);
  try {
    const tools = await handle.client.listTools();
    console.log('tools', tools);
    expect(tools.tools.length).toBeGreaterThan(0);
  } finally {
    await handle.close();
  }
});

test('Specific tool exists', async ({ clusterPage }) => {
  const mcpUrl = await resolveMcpUrl(clusterPage);
  const handle = await createMcpClient(mcpUrl);
  try {
    const names = await getMcpToolNames(handle.client);
    console.log('names', names);
    expect(names).toContain(CREATE_ROW_TOOL);
  } finally {
    await handle.close();
  }
});

test('Tool executes', async ({ clusterPage }) => {
  const mcpUrl = await resolveMcpUrl(clusterPage);
  const handle = await createMcpClient(mcpUrl);
  try {
    const result = await handle.client.callTool({
      name: 'Send_Message_on_Slack',
      arguments: { Message_Content: 'hi' },
    });
    console.log('result', result);
    expect(result).toBeDefined();
  } finally {
    await handle.close();
  }
});

test('Tool works multiple times (stability)', async ({ clusterPage }) => {
  const mcpUrl = await resolveMcpUrl(clusterPage);
  const handle = await createMcpClient(mcpUrl);
  try {
    for (let i = 0; i < 3; i++) {
      const result = await handle.client.callTool({
        name: 'Send_Message_on_Slack',
        arguments: { Message_Content: 'hi' },
      });
      console.log('result', result);
      expect(result).toBeDefined();
    }
  } finally {
    await handle.close();
  }
});

