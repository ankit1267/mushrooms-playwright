export const CREATE_ROW_TOOL = 'Add_New_Row_To_Sheet_on_Google_Sheets';

interface ToolLike {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ClientLike {
  listTools: () => Promise<{ tools: ToolLike[] }>;
}

export async function getMcpTools(client: ClientLike): Promise<ToolLike[]> {
  const response = await client.listTools();
  return response.tools;
}

export async function getMcpToolNames(client: ClientLike): Promise<string[]> {
  const tools = await getMcpTools(client);
  return tools.map(tool => tool.name);
}
