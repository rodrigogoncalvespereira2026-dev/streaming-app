import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows the six universe tabs', async ({ page }) => {
  await expect(page.getByRole('tab')).toHaveCount(6);
});

test('Rangers tab lists masters with CSS helmets', async ({ page }) => {
  await page.getByRole('tab', { name: 'Rangers' }).click();
  const cards = page.locator('#masterList .master');
  expect(await cards.count()).toBeGreaterThan(0);
  const helmet = cards.first().locator('.helmet');
  await expect(helmet).toBeVisible();
  // Helmet must be CSS, not an image.
  expect(await page.locator('#masterList img').count()).toBe(0);
});

test('expands a master to reveal zord, weapon and quote', async ({ page }) => {
  await page.getByRole('tab', { name: 'Rangers' }).click();
  const head = page.locator('#masterList .master-head').first();
  const body = page.locator('#masterList .master-body').first();
  await expect(body).toBeHidden();
  await head.click();
  await expect(body).toBeVisible();
  await expect(body).toContainText('Zord');
  await expect(body).toContainText('Arma');
});

test('Villains tab shows threat bars and the four mandatory villains', async ({ page }) => {
  await page.getByRole('tab', { name: 'Vilões' }).click();
  const list = page.locator('#villainList .villain');
  expect(await list.count()).toBeGreaterThanOrEqual(4);
  await expect(list.first().locator('.threat-seg')).toHaveCount(5);
  for (const name of ['Maltherion', 'Valtherion', 'Lorde Arcano', 'Presidente']) {
    await expect(page.locator('#villainList')).toContainText(name);
  }
});

test('navigates to an episode from a villain link', async ({ page }) => {
  await page.getByRole('tab', { name: 'Vilões' }).click();
  await page.locator('#villainList .ep-link').first().click();
  await expect(page.locator('#epPanel')).toBeVisible();
  await expect(page.locator('#epList article.open .ep-toggle')).toHaveCount(1);
});

test('Glossário tab filters and shows an A-Z index', async ({ page }) => {
  await page.getByRole('tab', { name: 'Glossário' }).click();
  const items = page.locator('#glossaryList .glossary-item');
  const initial = await items.count();
  expect(initial).toBeGreaterThanOrEqual(20);
  expect(await page.locator('#glossaryIndex button').count()).toBeGreaterThan(1);

  await page.fill('#glossaryInput', 'zord');
  const filtered = await items.count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(initial);
});

test('Glossário shows an empty state with no match', async ({ page }) => {
  await page.getByRole('tab', { name: 'Glossário' }).click();
  await page.fill('#glossaryInput', 'zzzzqqq');
  await expect(page.locator('#glossaryList .glossary-item')).toHaveCount(0);
  await expect(page.locator('#glossaryCount')).toContainText('0');
});

test('Linha do Tempo lists arcs and filters by arc', async ({ page }) => {
  await page.getByRole('tab', { name: 'Linha do Tempo' }).click();
  const all = page.locator('#timelineList li');
  const total = await all.count();
  expect(total).toBeGreaterThan(1);
  await expect(all.first()).toContainText('Episódio');

  await page.selectOption('#arcSelect', { index: 1 });
  expect(await all.count()).toBe(1);
});

test('timeline key episode opens that episode', async ({ page }) => {
  await page.getByRole('tab', { name: 'Linha do Tempo' }).click();
  const target = page.locator('#timelineList [data-open-ep]').first();
  const label = await target.textContent();
  const num = (label ?? '').replace(/\D+/g, '');
  await target.click();
  await expect(page.locator('#epList article.open')).toHaveCount(1);
  await expect(page.locator('#epList article.open')).toContainText(num);
});

test('tabs remain keyboard navigable with six tabs', async ({ page }) => {
  await page.locator('#tabEp').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tabTr')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.locator('#tabTl')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tlPanel')).toBeVisible();
});
