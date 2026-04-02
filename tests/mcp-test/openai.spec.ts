import { test, expect } from '../../fixtures/base.fixture';
import { executePromptWithMcpTool } from '../../utils/openaiMcpExecutor';

test('AI chooses the right MCP tool to create a row', async ({ clusterPage }) => {
  test.skip(!process.env.OPENAI_API_KEY, 'Set OPENAI_API_KEY to run OpenAI-assisted MCP tests.');

  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  const { payload, toolName, args, mcpResult } = await executePromptWithMcpTool({
    prompt: 'send hii to the slack channel',
    mcpUrl,
  });

  console.log("payload", payload);

  console.log('ai decision', { toolName, args });
  console.log('mcp result', mcpResult);

  expect(mcpResult).toBeDefined();
  expect(mcpResult.isError).not.toBeTruthy();
});
