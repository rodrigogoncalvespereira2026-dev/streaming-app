import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

/** Marks episodes as watched through the real UI, one at a time. */
async function markWatched(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const card = page.locator('#epList article').nth(i);
    await card.locator('.ep-toggle').click();
    await card.getByRole('button', { name: /Marcar visto/i }).click();
    await card.locator('.ep-toggle').click();
  }
}

test('shows the global progress bar at zero on a fresh install', async ({ page }) => {
  await expect(page.locator('#overallText')).toHaveText('0 de 131 vistos (0%)');
  await expect(page.locator('#overallBar')).toHaveAttribute('aria-valuenow', '0');
  expect(await page.locator('#overallFill').evaluate((el) => el.style.width)).toBe('0%');
});

test('updates the global bar when episodes are marked watched', async ({ page }) => {
  await markWatched(page, 3);
  await expect(page.locator('#overallText')).toHaveText('3 de 131 vistos (2%)');
  await expect(page.locator('#overallBar')).toHaveAttribute('aria-valuenow', '2');
  expect(await page.locator('#overallFill').evaluate((el) => el.style.width)).toBe('2%');
});

test('shows the season counter in the selector and the tab badge', async ({ page }) => {
  await markWatched(page, 2);
  await expect(page.locator('#seasonSelect option:checked')).toHaveText('Temp. 1 · 2/25 vistos');
  await expect(page.locator('#tabEpBadge')).toHaveText('2/25');
});

test('season counter follows the selected season', async ({ page }) => {
  await markWatched(page, 2);
  await page.selectOption('#seasonSelect', '2');
  await expect(page.locator('#seasonSelect option:checked')).toHaveText('Temp. 2 · 0/25 vistos');
  await expect(page.locator('#tabEpBadge')).toHaveText('0/25');
});

test('counters persist across a reload', async ({ page }) => {
  await markWatched(page, 2);
  await page.reload();
  await expect(page.locator('#overallText')).toHaveText('2 de 131 vistos (1%)');
  await expect(page.locator('#tabEpBadge')).toHaveText('2/25');
});

test('Continuar a ver points at the first unwatched episode', async ({ page }) => {
  await markWatched(page, 3);
  const card = page.locator('#continueList .continue-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Episódio 4');
  await expect(card).toContainText('Começar');
});

test('opening the continue card expands that episode', async ({ page }) => {
  await markWatched(page, 2);
  await page.locator('#continueList .continue-card').click();
  await expect(page.locator('#epList article.open')).toHaveCount(1);
  await expect(page.locator('#epList article.open')).toContainText('Episódio 3');
});

test('shows a completion state when the season is finished', async ({ page }) => {
  await page.evaluate(() => {
    const watched: Record<string, boolean> = {};
    for (let i = 1; i <= 25; i += 1) watched[i] = true;
    localStorage.setItem('pf_watched', JSON.stringify(watched));
  });
  await page.reload();
  await expect(page.locator('#continueDone')).toBeVisible();
  await expect(page.locator('#continueDone')).toContainText('Viste tudo');
  await expect(page.locator('#continueList .continue-card')).toHaveCount(0);
  await expect(page.locator('#seasonSelect option:checked')).toHaveText('Temp. 1 · 25/25 vistos');
  await expect(page.locator('#overallText')).toHaveText('25 de 131 vistos (19%)');
});

test('resumes a partially watched episode', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'pf_progress',
      JSON.stringify({ 1: { seconds: 30, duration: 120, updatedAt: Date.now(), seq: 1 } }),
    );
  });
  await page.reload();
  const card = page.locator('#continueList .continue-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Retomar');
  await expect(card).toContainText('Episódio 1');
  await expect(card.locator('.progress')).toHaveAttribute('aria-valuenow', '25');
});

test('no polling: counters stay correct without interaction', async ({ page }) => {
  await markWatched(page, 1);
  await page.waitForTimeout(600);
  await expect(page.locator('#overallText')).toHaveText('1 de 131 vistos (0%)');
  await expect(page.locator('#tabEpBadge')).toHaveText('1/25');
});
