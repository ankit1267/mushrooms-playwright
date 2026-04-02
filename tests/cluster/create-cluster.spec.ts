import { test, expect } from '../../fixtures/base.fixture';
import type { CreateClusterResponse, DeleteClusterResponse } from '../../pages/cluster/cluster.page';

test('create and delete windsurf cluster and verify url response + UI name', async ({ clusterPage, page }) => {
  await clusterPage.gotoClusterOneAndCopyMcpEndpointUrl();
  await clusterPage.openNewClusterModal();
  await clusterPage.searchClientInModal('windsurf');
  await clusterPage.selectClientInModal('windsurf');

  const responsePayload = await clusterPage.clickDoneAndCaptureCreateClusterResponse();
  const payload = responsePayload as CreateClusterResponse;

  console.log('create cluster response', JSON.stringify(payload, null, 2));

  expect(payload.success).toBeTruthy();
  expect(payload.message).toBe('Tool successfully created or updated');
  expect(payload.data.client).toBe('Windsurf');
  expect(payload.data.name).toMatch(/^Cluster\s+\d+$/);
  expect(payload.data.url).toContain(`https://mcp.viasocket.com/mcp/${payload.data._id}-`);

  await expect(page).toHaveURL(new RegExp(`/cluster/${payload.data._id}$`));
  await expect(clusterPage.getClusterButtonByName(payload.data.name)).toBeVisible();

  const deleteResponsePayload = await clusterPage.deleteClusterAndCaptureResponse(payload.data._id);
  const deletePayload = deleteResponsePayload as DeleteClusterResponse;

  expect(deletePayload.success).toBeTruthy();
  expect(deletePayload.message.toLowerCase()).toContain('delete');
  if (deletePayload.data?._id) {
    expect(deletePayload.data._id).toBe(payload.data._id);
  }

  await expect(clusterPage.getClusterButtonsByName(payload.data.name)).toHaveCount(0);
});
