import { test, expect } from '../../fixtures/base.fixture';
import { createMcpClient } from '../../utils/mcpClient';

function getTextContentFromToolResult(result: unknown): string {
  const content = (result as { content?: Array<{ type?: string; text?: string }> } | null)?.content;
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .filter(item => item?.type === 'text' && typeof item.text === 'string')
    .map(item => item.text as string)
    .join('\n');
}

async function assertSuccessfulHistoryEntry(
  clusterPage: {
    openHistoryTab: () => Promise<void>;
    getHistoryRowByToolName: (toolName: string) => { count: () => Promise<number> };
    openLatestSuccessfulHistoryRowByToolName: (toolName: string) => Promise<void>;
  },
  toolName: string,
): Promise<void> {
  await clusterPage.openHistoryTab();
  const initialCount = await clusterPage.getHistoryRowByToolName(toolName).count();

  await expect
    .poll(async () => clusterPage.getHistoryRowByToolName(toolName).count(), {
      timeout: 45_000,
      intervals: [1_000, 2_000, 3_000],
    })
    .toBeGreaterThan(initialCount);

  await clusterPage.openLatestSuccessfulHistoryRowByToolName(toolName);
}

test('history output contains hi text', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  const handle = await createMcpClient(mcpUrl);
  try {
    const result = await handle.client.callTool({
      name: 'Send_Message_on_Slack',
      arguments: { Message_Content: 'hi' },
    });

    const resultText = getTextContentFromToolResult(result);
    expect(resultText).toMatch(/"success"\s*:\s*true/i);
  } finally {
    await handle.close();
  }

  await assertSuccessfulHistoryEntry(clusterPage, 'Send_Message_on_Slack');
});


test('history output contains spreadsheet response', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  const handle = await createMcpClient(mcpUrl);
  try {
    const toolsResponse = await handle.client.listTools();
    const rowTool = toolsResponse.tools.find(tool => tool.name === 'Add_New_Row_To_Sheet_on_Google_Sheets');
    if (!rowTool) {
      throw new Error('Add_New_Row_To_Sheet_on_Google_Sheets tool not found');
    }

    const properties =
      (rowTool.inputSchema as { properties?: Record<string, unknown> } | undefined)?.properties ?? {};
    const propertyKeys = Object.keys(properties);
    const rowArguments: Record<string, unknown> = {};
    if (propertyKeys[0]) rowArguments[propertyKeys[0]] = 'mushroom';
    if (propertyKeys[1]) rowArguments[propertyKeys[1]] = 'mushroom2';

    const result = await handle.client.callTool({
      name: 'Add_New_Row_To_Sheet_on_Google_Sheets',
      arguments: rowArguments,
    });

    const resultText = getTextContentFromToolResult(result);
    expect(resultText).toMatch(/"success"\s*:\s*true/i);
  } finally {
    await handle.close();
  }

  await assertSuccessfulHistoryEntry(clusterPage, 'Add_New_Row_To_Sheet_on_Google_Sheets');
});

