import { test, expect } from '../../fixtures/base.fixture';
import { createMcpClient } from '../../utils/mcpClient';

test('history output contains hi text', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  await new Promise(resolve => setTimeout(resolve, 5000));

  const handle = await createMcpClient(mcpUrl);
  try {
    await handle.client.callTool({
      name: 'Send_Message_on_Slack',
      arguments: { Message_Content: 'hi' },
    });
  } finally {
    await handle.close();
  }

  await new Promise(resolve => setTimeout(resolve, 10000));
  await clusterPage.openHistoryTab();
  
  await clusterPage.openFirstHistoryRow();

  const outputJson = await clusterPage.getOutputJsonText();

  expect(outputJson).toMatch(/"text"\s*:\s*"hi/i);
});


test('history output contains spreadsheet response', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  await new Promise(resolve => setTimeout(resolve, 5000));

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

    await handle.client.callTool({
      name: 'Add_New_Row_To_Sheet_on_Google_Sheets',
      arguments: rowArguments,
    });
  } finally {
    await handle.close();
  }

  await new Promise(resolve => setTimeout(resolve, 10000));
  await clusterPage.openHistoryTab();
  
  await clusterPage.openFirstHistoryRow();

  const outputJson = await clusterPage.getOutputJsonText();

  expect(outputJson).toMatch(/"success"\s*:\s*true/i);

});

