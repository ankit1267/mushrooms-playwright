import { createMcpClient } from './mcpClient';

interface ToolLike {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

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

export interface McpToolExecutionResult {
  isError?: boolean;
  [key: string]: unknown;
}

export interface ExecutePromptWithMcpOptions {
  prompt: string;
  mcpUrl: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  mcpToolTimeoutMs?: number;
}

const DEBUG_MCP_EXECUTOR = process.env.DEBUG_MCP_EXECUTOR === 'true';

export interface ExecutePromptWithMcpResult {
  payload: OpenAiResponse;
  toolName: string;
  args: Record<string, unknown>;
  mcpResult: McpToolExecutionResult;
}

function buildOpenAiToolSchema(tools: ToolLike[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: (tool.inputSchema ?? {
        type: 'object',
        properties: {},
        additionalProperties: true,
      }) as Record<string, unknown>,
    },
  }));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function executePromptWithMcpTool(options: ExecutePromptWithMcpOptions): Promise<ExecutePromptWithMcpResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required. Pass apiKey in options or set OPENAI_API_KEY.');
  }

  const handle = await createMcpClient(options.mcpUrl);
  try {
    const responseTools = await handle.client.listTools();
    const openAiTools = buildOpenAiToolSchema(responseTools.tools);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Connection: 'close',
      },
      body: JSON.stringify({
        model: options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: options.temperature ?? 0,
        messages: [{ role: 'user', content: options.prompt }],
        tools: openAiTools,
        tool_choice: 'auto',
      }),
    });

    const payload = (await response.json()) as OpenAiResponse;

    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`);
    }

    const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.name || !toolCall.function.arguments) {
      const assistantContent = payload.choices?.[0]?.message?.content;
      throw new Error(`OpenAI did not return a tool call. Assistant content: ${assistantContent ?? 'empty'}`);
    }

    const toolName = toolCall.function.name;
    let args: Record<string, unknown>;

    try {
      args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    } catch {
      throw new Error(`Failed to parse tool arguments JSON: ${toolCall.function.arguments}`);
    }

    if (DEBUG_MCP_EXECUTOR) {
      console.log('toolName', toolName);
      console.log('args', args);
    }

    const mcpToolTimeoutMs = options.mcpToolTimeoutMs ?? 25000;
    const mcpResult = (await withTimeout(
      handle.client.callTool({
        name: toolName,
        arguments: args,
      }) as Promise<McpToolExecutionResult>,
      mcpToolTimeoutMs,
      `MCP tool call timed out after ${mcpToolTimeoutMs}ms (${toolName}).`,
    )) as McpToolExecutionResult;

    return { payload, toolName, args, mcpResult };
  } finally {
    await handle.close();
  }
}
