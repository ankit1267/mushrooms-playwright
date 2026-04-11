import type { FrameLocator, Locator, Page } from '@playwright/test';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface CreateClusterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    orgId: string;
    name: string;
    isAuthenticationEnabled: boolean;
    client: string;
    _id: string;
    createdAt: string;
    __v: number;
    url: string;
  };
}

export interface DeleteClusterResponse {
  success: boolean;
  message: string;
  data?: {
    _id?: string;
    name?: string;
    client?: string;
  } | null;
}

export class ClusterPage {
  private readonly frame: FrameLocator;

  constructor(private readonly page: Page) {
    this.frame = page.frameLocator('iframe[title="iframe"]');
  }

  async openClusterFromMcpUrl(): Promise<void> {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      throw new Error('APP_URL is not set');
    }

    await this.page.goto(appUrl);
    await this.page.waitForURL(/\/cluster\/[a-f0-9]+/i, { timeout: 30_000 });
  }

  async clickClusterOne(): Promise<void> {
    await this.page.getByRole('button', { name: /cluster 1/i }).first().click();
  }

  async openHistoryTab(): Promise<void> {
    await this.frame.getByRole('button', { name: 'History' }).click();
  }

  async openFirstHistoryRow(): Promise<void> {
    await this.frame.locator('[role="rowgroup"] [role="row"]').first().click();
  }

  getHistoryRowByToolName(toolName: string): Locator {
    return this.frame.getByRole('row', {
      name: new RegExp(`${escapeRegExp(toolName)}.*success`, 'i'),
    });
  }

  async openLatestSuccessfulHistoryRowByToolName(toolName: string): Promise<void> {
    await this.getHistoryRowByToolName(toolName).first().click();
  }

  async getOutputJsonText(): Promise<string> {
    const outputContainer = this.frame.getByRole('region').filter({ hasText: 'Output' }).first();
    const outputTextBox = outputContainer.locator('[role="textbox"]').first();

    await outputTextBox.waitFor({ state: 'visible' });
    const outputText = await outputTextBox.textContent();

    return outputText ?? '';
  }

  async openNewClusterModal(): Promise<void> {
    await this.page.getByTestId('sidebar-new-cluster').click();
  }

  async searchClientInModal(clientName: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Search clients...' }).fill(clientName);
  }

  async selectClientInModal(clientName: string): Promise<void> {
    await this.page.getByTestId(`ai-client-option-${clientName.toLowerCase()}`).click();
  }

  async clickDoneAndCaptureCreateClusterResponse(): Promise<CreateClusterResponse> {
    const createResponsePromise = this.page.waitForResponse(response =>
      response.url().includes('/api/mcp')
      && response.request().method() === 'POST'
      && response.status() === 201,
    );

    await this.page.getByTestId('ai-client-modal-done').click();

    const response = await createResponsePromise;
    const payload = (await response.json()) as CreateClusterResponse;

    return payload;
  }

  getClusterButtonByName(clusterName: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`\\b${clusterName}\\b`, 'i') }).first();
  }

  getClusterButtonsByName(clusterName: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`\\b${clusterName}\\b`, 'i') });
  }

  async getMcpEndpointUrl(): Promise<string> {
    const endpointInput = this.page
      .locator('div')
      .filter({ hasText: 'MCP Endpoint URL' })
      .getByRole('textbox')
      .first();

    return endpointInput.inputValue();
  }

  async getMcpConfigJsonText(): Promise<string> {
    const jsonConfig = this.page.locator('div').filter({ hasText: '"mcpServers": {' }).first();
    await jsonConfig.waitFor({ state: 'visible' });

    return (await jsonConfig.textContent()) ?? '';
  }

  async copyMcpEndpointUrl(): Promise<string> {
    const endpointInput = this.page
      .locator('div')
      .filter({ hasText: 'MCP Endpoint URL' })
      .getByRole('textbox')
      .first();

    await endpointInput.locator('xpath=ancestor::div[1]').getByRole('button', { name: 'Copy' }).click();

    return this.readClipboardText();
  }

  async copyMcpConfigJson(): Promise<string> {
    const jsonSection = this.page.locator('div').filter({ hasText: '"mcpServers": {' }).first();
    await jsonSection.locator('button:has-text("Copy")').first().click();

    return this.readClipboardText();
  }

  async gotoClusterOneAndCopyMcpEndpointUrl(): Promise<string> {
    await this.openClusterFromMcpUrl();
    await this.clickClusterOne();

    return this.copyMcpEndpointUrl();
  }

  async deleteClusterAndCaptureResponse(clusterId: string): Promise<DeleteClusterResponse> {
    const deleteResponsePromise = this.page.waitForResponse(response =>
      response.url().includes(`/api/mcp/${clusterId}`)
      && response.request().method() === 'DELETE'
      && (response.status() === 200 || response.status() === 204),
    );

    await this.page.getByTestId(`sidebar-cluster-menu-${clusterId}`).click();
    await this.page.getByTestId(`sidebar-delete-cluster-${clusterId}`).click();
    await this.page
      .getByRole('dialog', { name: /delete cluster\?/i })
      .getByRole('button', { name: 'Delete' })
      .click();

    const response = await deleteResponsePromise;
    if (response.status() === 204) {
      return {
        success: true,
        message: 'Cluster deleted',
        data: { _id: clusterId },
      };
    }

    const payload = (await response.json()) as Partial<DeleteClusterResponse>;

    return {
      success: payload.success ?? true,
      message: payload.message ?? '',
      data: payload.data ?? null,
    };
  }

  private async readClipboardText(): Promise<string> {
    return this.page.evaluate(async () => navigator.clipboard.readText());
  }
}
