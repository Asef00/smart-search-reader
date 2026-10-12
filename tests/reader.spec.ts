import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Deterministic scrolling also exercises the reduced-motion preference.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
});

test('search highlights all matches, scrolls, wraps and resets cleanly', async ({ page }) => {
  const search = page.getByRole('combobox', { name: 'جستجو در متن' });
  await search.fill('تجربه کاربری');
  const matches = page.locator('article mark');
  expect(await matches.count()).toBeGreaterThan(1);
  const first = await page.locator('mark[aria-current="true"]').getAttribute('id');
  const count = await matches.count();
  await expect(page.locator('.search-status')).toHaveText(`۱ از ${count.toLocaleString('fa-IR')} نتیجه`);
  await expect(page.locator('mark[aria-current="true"]')).toBeInViewport();
  await page.getByRole('button', { name: 'نتیجهٔ قبلی', exact: true }).click();
  await expect(page.locator('.search-status')).toHaveText(`${count.toLocaleString('fa-IR')} از ${count.toLocaleString('fa-IR')} نتیجه`);
  await expect(page.locator('mark[aria-current="true"]')).toBeInViewport();
  await page.getByRole('button', { name: 'نتیجهٔ بعدی', exact: true }).click();
  await expect(page.locator('mark[aria-current="true"]')).toHaveAttribute('id', first!);
  await search.fill('نیست‌دراین‌متن');
  await expect(page.locator('.search-status')).toHaveText('نتیجه‌ای پیدا نشد');
  await expect(matches).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'نتیجهٔ بعدی', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'پاک کردن جستجو', exact: true }).click();
  await expect(search).toBeFocused();
  await expect(page.locator('.search-status')).toHaveText('جستجو در همین متن');
});

test('autocomplete supports keyboard, Escape and pointer selection', async ({ page }) => {
  const search = page.getByRole('combobox');
  await search.fill('خوا');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await search.press('ArrowDown');
  const selected = page.getByRole('option', { selected: true });
  const word = await selected.locator('span').textContent();
  await search.press('Enter');
  await expect(search).toHaveValue(word!);
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await search.fill('خوا');
  await search.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(search).toHaveValue('خوا');
  await search.press('ArrowUp');
  await expect(page.getByRole('option', { selected: true })).toHaveCount(1);
  await page.getByRole('option').first().click();
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await search.fill('تجربه کاربری');
  await search.press('Enter');
  await expect(page.locator('.search-status')).toContainText('۲ از');
  await search.press('Shift+Enter');
  await expect(page.locator('.search-status')).toContainText('۱ از');
});

test('single result has no arrows, special characters stay literal', async ({ page }) => {
  const search = page.getByRole('combobox');
  await search.fill('banana');
  await expect(page.locator('article mark')).toHaveCount(0);
  await search.fill('PWA');
  await expect(page.locator('article mark')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'نتیجهٔ بعدی', exact: true })).toHaveCount(0);
  await search.fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('article mark')).toHaveCount(0);
  await expect(page.locator('article img')).toHaveCount(0);
  await search.fill('.*');
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('section results navigate to their match and counts agree', async ({ page }) => {
  await page.getByRole('combobox').fill('جستجو');
  await page.getByRole('combobox').press('Escape');
  const counts = await page.locator('.count-badge').allTextContents();
  const toNumber = (text: string) => Number(text.replace(/[۰-۹]/g, n => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n))));
  expect(counts.reduce((sum, n) => sum + toNumber(n), 0)).toBe(await page.locator('article mark').count());
  await page.locator('.result-card').last().click();
  await expect(page.locator('article section').last().locator('mark[aria-current="true"]')).toHaveCount(1);
  await expect(page.locator('mark[aria-current="true"]')).toBeInViewport();
});

test('normalizes Persian input and avoids horizontal page overflow', async ({ page }) => {
  await page.getByRole('combobox').fill('كلمه');
  expect(await page.locator('article mark').count()).toBeGreaterThan(0);
  await page.getByRole('combobox').fill('می توان');
  await expect(page.locator('article mark').first()).toHaveText('می‌توان');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('production shell, font and search survive an offline reload', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
    await document.fonts.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'خواندن، با کمی دقت بیشتر' })).toBeVisible();
  await expect(page.locator('.connection')).toHaveText('در حال مطالعهٔ آفلاین');
  await page.getByRole('combobox').fill('آفلاین');
  expect(await page.locator('article mark').count()).toBeGreaterThan(1);
  await page.getByRole('combobox').fill('خوا');
  await expect(page.getByRole('listbox')).toBeVisible();
  expect(await page.evaluate(async () => {
    await document.fonts.load('14px Vazirmatn');
    return document.fonts.check('14px Vazirmatn');
  })).toBe(true);
  await context.setOffline(false);
  await expect(page.locator('.connection')).not.toHaveText('در حال مطالعهٔ آفلاین');
});

test('manifest supplies local install icons and a scoped start URL', async ({ page, request }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const response = await request.get(href!);
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./');
  expect(manifest.dir).toBe('rtl');
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
  }
});
