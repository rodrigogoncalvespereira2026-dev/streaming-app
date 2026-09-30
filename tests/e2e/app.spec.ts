import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('lists episodes for the first season', async ({ page }) => {
  const cards = page.locator('#epList article');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBe(25);
});

test('switches seasons', async ({ page }) => {
  await page.selectOption('#seasonSelect', '2');
  await expect(page.locator('#epList article').first()).toContainText('26');
  expect(await page.locator('#epList article').count()).toBe(25);
});

test('search narrows the list and clears with the season change', async ({ page }) => {
  await page.fill('#searchInput', 'Retorno');
  // Several season 1 synopses mention "Retorno", so assert narrowing, not an exact count.
  await expect(page.locator('#resultCount')).toContainText('para "Retorno"');
  expect(await page.locator('#epList article').count()).toBeLessThan(25);
  await page.selectOption('#seasonSelect', '2');
  expect(await page.inputValue('#searchInput')).toBe('');
});

test('marks an episode as watched and persists it', async ({ page }) => {
  const first = page.locator('#epList article').first();
  await first.locator('.ep-toggle').click();
  await first.getByRole('button', { name: /Marcar visto/i }).click();
  await expect(first.getByRole('button', { name: /Marcar como nao visto/i })).toBeVisible();
  await page.reload();
  await page.locator('#epList article').first().locator('.ep-toggle').click();
  await expect(page.locator('#epList article').first().getByRole('button', { name: /Marcar como nao visto/i })).toBeVisible();
});

test('favorites an episode and filters to it', async ({ page }) => {
  // The favorite control lives in the always-visible accordion header.
  await page.locator('#epList article').first().getByRole('button', { name: /Favorito/i }).click();
  // Scope to the filter chip: every card also has a "Favoritos" aria-label.
  await page.locator('.chip[data-status="favorites"]').click();
  await expect(page.locator('#epList article')).toHaveCount(1);
});

test('expands an episode accordion', async ({ page }) => {
  const first = page.locator('#epList article').first();
  const toggle = first.locator('.ep-toggle');
  const body = first.locator('.ep-body');
  await expect(body).toBeHidden();
  await toggle.click();
  await expect(body).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(body).toBeHidden();
});

test('moves arrow keys between episodes', async ({ page }) => {
  await page.locator('#epList .ep-toggle').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#epList .ep-toggle').nth(1)).toBeFocused();
});

test('switches tabs with arrow keys', async ({ page }) => {
  await page.locator('#tabEp').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#trPanel')).toBeVisible();
  await expect(page.locator('#tabTr')).toHaveAttribute('aria-selected', 'true');
});

test('toggles the theme and remembers it', async ({ page }) => {
  const before = await page.getAttribute('html', 'data-theme');
  await page.locator('#themeBtn').click();
  const after = await page.getAttribute('html', 'data-theme');
  expect(after).not.toBe(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? /.*/);
});

test('shows a player with custom controls on the trailers tab', async ({ page }) => {
  await page.getByRole('tab', { name: 'Trailers' }).click();
  await expect(page.locator('#trailerMain video')).toBeVisible();
  // Both the big overlay and the control bar expose a play button; assert on the bar.
  await expect(page.locator('#trailerMain .ctl[aria-label="Reproduzir"], #trailerMain .ctl[aria-label="Pausar"]').first()).toBeVisible();
  await expect(page.locator('#trailerMain [role="slider"]').first()).toBeVisible();
});

test('hides the centre play button while the video plays and the controls autohide', async ({ page }) => {
  // Force the desktop hover path. On a touch profile the `@media (pointer: coarse)`
  // rule hides the button with `display: none`, which would mask the cascade bug
  // this test is about.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addStyleTag({
    content: '@media (pointer: coarse){ .player.is-playing .big-play { display: revert !important; } }',
  });
  await page.getByRole('tab', { name: 'Trailers' }).click();
  const shell = page.locator('#trailerMain .player');
  const bigPlay = page.locator('#trailerMain .big-play');

  // `opacity: 0` still counts as visible to the locator, so read the computed
  // style. This is the exact value that was wrong before the fix.
  const opacity = () => bigPlay.evaluate((n) => getComputedStyle(n).opacity);

  // Paused: the centre button is the call to action.
  await expect(bigPlay).toBeVisible();
  expect(await opacity()).toBe('1');

  // Playing: the centre button must fade out.
  await shell.evaluate((node) => {
    (node.querySelector('video') as HTMLVideoElement).play().catch(() => {});
  });
  await expect(shell).toHaveClass(/is-playing/);
  await expect.poll(opacity).toBe('0');

  // The regression: while the video plays and the pointer sits still, the
  // autohide timer adds `is-idle` on top of `is-playing`. Both rules matched the
  // centre button with equal specificity, and `is-idle` came last, so the button
  // came back on top of the running video.
  await shell.evaluate((node) => node.classList.add('is-idle'));
  await expect(shell).toHaveClass(/is-playing/);
  await expect(shell).toHaveClass(/is-idle/);
  await expect.poll(opacity).toBe('0');

  // Paused again: the button returns.
  await shell.evaluate((node) => {
    (node.querySelector('video') as HTMLVideoElement).pause();
  });
  await expect(shell).not.toHaveClass(/is-playing/);
  await expect.poll(opacity).toBe('1');
});

test('serves a valid manifest with icons', async ({ request }) => {  const res = await request.get('/manifest.json');
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.display).toBe('standalone');
  expect(body.icons.length).toBeGreaterThan(0);
  for (const icon of body.icons) {
    const iconRes = await request.get('/' + icon.src);
    expect(iconRes.ok(), icon.src).toBe(true);
  }
});

test('ships a service worker that precaches the shell', async ({ request }) => {
  const res = await request.get('/sw.js');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('__PRECACHE__');
});

test('clears local data from settings', async ({ page }) => {
  await page.locator('#epList article').first().locator('.ep-toggle').click();
  await page.locator('#epList article').first().getByRole('button', { name: /Marcar visto/i }).click();
  await page.locator('#settingsBtn').click();
  await page.locator('#clearDataBtn').click();
  await expect(page.locator('#resultCount')).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem('pf_watched'));
  expect(raw === null || raw === '{}').toBe(true);
});
