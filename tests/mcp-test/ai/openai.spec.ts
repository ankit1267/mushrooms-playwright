import { test, expect } from '@playwright/test';
import { createMcpClient } from '../../../utils/mcpClient';
import { getMcpTools, MCP_URL } from '../toolList';

interface OpenAiToolCall {
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface OpenAiResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: OpenAiToolCall[];
    };
  }>;
  error?: {
    message?: string;
  };
}

test('AI chooses the right MCP tool to create a row', async () => {
  test.skip(!process.env.OPENAI_API_KEY, 'Set OPENAI_API_KEY to run OpenAI-assisted MCP tests.');

  const client = await createMcpClient(MCP_URL);
  const tools = await getMcpTools(client);

  const openaiTools = tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: (tool.inputSchema ?? {
        type: 'object',
        properties: {},
        additionalProperties: true
      }) as Record<string, unknown>
    }
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'user', content: 'send hii to the slack channel' }],
      tools: openaiTools,
      tool_choice: 'auto'
    })
  });

  const payload = (await response.json()) as OpenAiResponse;

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`);
  }

  console.log("payload", payload);

  const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.name || !toolCall.function.arguments) {
    const assistantContent = payload.choices?.[0]?.message?.content;
    throw new Error(`OpenAI did not return a tool call. Assistant content: ${assistantContent ?? 'empty'}`);
  }

  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

  const mcpResult = await client.callTool({
    name: toolName,
    arguments: args
  });

  console.log('ai decision', { toolName, args });
  console.log('mcp result', mcpResult);

  expect(mcpResult).toBeDefined();
  expect(mcpResult.isError).not.toBeTruthy();
});
