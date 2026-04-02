import { test, expect } from '../../fixtures/base.fixture';
import { executePromptWithMcpTool } from '../../utils/openaiMcpExecutor';

test('history output contains hi text', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executePromptWithMcpTool({
    prompt: 'send hi to the slack channel',
    mcpUrl,
  });

  await new Promise(resolve => setTimeout(resolve, 10000));
  await clusterPage.openHistoryTab();
  
  await clusterPage.openFirstHistoryRow();

  const outputJson = await clusterPage.getOutputJsonText();

  expect(outputJson).toMatch(/"text"\s*:\s*"hi/i);
});


test('history output contains spreadsheet response', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executePromptWithMcpTool({
    prompt: 'add a new row to the googlesheet with values "mushroom", "mushroom2"',
    mcpUrl,
  });

  await new Promise(resolve => setTimeout(resolve, 10000));
  await clusterPage.openHistoryTab();
  
  await clusterPage.openFirstHistoryRow();

  const outputJson = await clusterPage.getOutputJsonText();

  expect(outputJson).toMatch(/"success"\s*:\s*true/i);

});

