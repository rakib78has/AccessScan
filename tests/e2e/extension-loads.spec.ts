import { expect, test } from './fixtures';

test.describe('SC-E2E-001 extension loads', () => {
  test('registers its service worker from the built package', ({ serviceWorker }) => {
    expect(serviceWorker.url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\/service-worker\.js$/);
  });

  test('renders the popup without console or page errors', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    await expect(page.getByRole('heading', { level: 1, name: 'SiteCheck' })).toBeVisible();
    await expect(page.getByTestId('automation-disclaimer')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
