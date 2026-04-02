import fs from 'fs';
import path from 'path';
import { test as base, request as apiRequest } from '@playwright/test';
import { ClusterPage } from '../pages/cluster/cluster.page';

const AUTH_FILE = 'playwright/.auth/state.json';

const AUTH_API_URL = `${process.env.AUTH_API_URL}`;
const APP_URL = `${process.env.APP_URL}`;

let _cachedProxyToken = '';

export async function getProxyToken(): Promise<string> {
  if (_cachedProxyToken) return _cachedProxyToken;

  const api = await apiRequest.newContext();
  const res = await api.get(AUTH_API_URL);
  if (!res.ok()) throw new Error(`Auth API failed: ${res.status()}`);

  const data = await res.json();
  if (!data.data?.proxy_auth_token) throw new Error('No proxy_auth_token in response');

  _cachedProxyToken = data.data.proxy_auth_token;
  await api.dispose();
  return _cachedProxyToken;
}

type AppFixtures = {
  clusterPage: ClusterPage;
};

export const test = base.extend<AppFixtures>({
  storageState: [
    async ({ browser }, use) => {
      if (!fs.existsSync(AUTH_FILE)) {
        const proxyToken = await getProxyToken();

        const ctx = await browser.newContext();
        const p = await ctx.newPage();
        await p.goto(`${APP_URL}/login?proxy_auth_token=${proxyToken}`);
        await p.waitForURL(/\/cluster\/[a-f0-9]+/, { timeout: 30_000 });

        fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
        await ctx.storageState({ path: AUTH_FILE });
        await ctx.close();
      }

      await use(AUTH_FILE);
    },
    { scope: 'test' },
  ],
  clusterPage: async ({ page }, use) => {
    await use(new ClusterPage(page));
  },
});

export const expect = test.expect;
