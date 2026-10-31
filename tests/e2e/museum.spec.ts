import { test, expect } from '@playwright/test';

test('collection loads exhibits on demand and the featured title follows its object', async ({ page }) => {
  const errors: string[] = [], scripts = new Set<string>();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'script') scripts.add(request.url()); });
  await page.goto('/');
  await expect(page.locator('.museum-card')).toHaveCount(12);
  await page.locator('[data-feature="claw"]').click();
  await expect(page.locator('.exhibit-name')).toHaveText('Hold a little joy in your hand');
  const entranceScripts = scripts.size;
  await page.locator('.exhibit-play').click();
  await expect(page.getByRole('heading', { name: 'Claw Machine', exact: true })).toBeVisible();
  await expect(page.locator('.scene-root svg').first()).toBeVisible();
  // The exhibit chunk loads asynchronously while the entrance preview already
  // satisfies the heading and SVG checks, so poll instead of racing one sample.
  await expect.poll(() => scripts.size).toBeGreaterThan(entranceScripts);
  await expect(page.locator('.mechanical-audio')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('all twelve routes mount, leave and dispose cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  for (const id of ['washer', 'fan', 'claw', 'coffee', 'musicbox', 'vending', 'toaster', 'turntable', 'camera', 'elevator', 'bicycle', 'generator']) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('.scene-root[aria-busy]')).toHaveCount(0);
    await expect(page.locator('.museum-learning-entry')).toBeVisible();
    await expect(page.locator('.scene-root svg').first()).toBeVisible();
    await expect(page.locator('.mechanical-audio')).toHaveCount(1);
  }
  await page.goto('/#/retired-exhibit');
  await expect(page.getByRole('heading', { name: 'This exhibit was not found' })).toBeVisible();
  await page.locator('.migration-note a').click();
  await expect(page.locator('.museum-card')).toHaveCount(12);
  expect(errors).toEqual([]);
});

test('generator controls, language switch and page width work on this viewport', async ({ page }) => {
  await page.goto('/#/generator');
  await expect(page.locator('.gen-start')).toBeVisible();
  await page.locator('.gen-start').click();
  await expect(page.locator('.gen-start')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch to Chinese', exact: true }).click();
  await expect(page.getByRole('heading', { name: '手摇发电机', exact: true })).toBeVisible();
  await expect(page.locator('.mechanical-audio')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('failed chunk download exposes recovery and can be retried', async ({ page }) => {
  const chunk = /\/assets\/generator-[^/]+\.js$/;
  await page.route(chunk, route => route.abort());
  await page.goto('/#/generator');
  await expect(page.getByRole('alert')).toContainText('The exhibit could not load');
  await expect(page.locator('.scene-root[aria-busy]')).toHaveCount(0);
  await page.unroute(chunk);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.gen-start')).toBeVisible();
});
