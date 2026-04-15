import { test, expect } from '../../fixtures/base.fixture';

test('mcp server configuration is visible for ChatGPT cluster', async ({ clusterPage }) => {
  const mcpUrl = await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();

  const endpointUrl = await clusterPage.getMcpEndpointUrl();
  expect(endpointUrl).toBe(mcpUrl);

  const jsonConfigText = await clusterPage.getMcpConfigJsonText();

  console.log(jsonConfigText);
  expect(jsonConfigText).toContain('"mcpServers"');
  expect(jsonConfigText).toContain('"mushrooms"');
  expect(jsonConfigText).toContain(`"url": "${mcpUrl}"`);
  expect(jsonConfigText).toContain('"transport": "sse"');

  const copiedEndpointUrl = await clusterPage.copyMcpEndpointUrl();
  expect(copiedEndpointUrl).toBe(mcpUrl);

  const copiedJsonConfig = await clusterPage.copyMcpConfigJson();
  expect(copiedJsonConfig).toContain('"mcpServers"');
  expect(copiedJsonConfig).toContain('"mushrooms"');
  expect(copiedJsonConfig).toContain(`"url": "${mcpUrl}"`);
  expect(copiedJsonConfig).toContain('"transport": "sse"');
});
