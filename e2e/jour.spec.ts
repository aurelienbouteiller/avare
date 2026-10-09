import { expect, stored, TODAY, tab, test } from './fixtures';

test('affiche la séance du jour et le compte à rebours', async ({ page }) => {
  await page.goto('/');
  await expect(tab(page, "Aujourd'hui")).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.hero .jj')).toHaveText('J-7');
  await expect(page.locator('.hero h2')).toHaveText('Bloc 6 et enchaînement');
  await expect(page.locator('#dock')).toBeHidden();
});

test('marque la séance comme faite, et le garde après rechargement', async ({ page }) => {
  await page.goto('/');
  const done = page.getByRole('button', { name: /Marquer la séance comme faite/ });
  await done.click();
  await expect(page.getByRole('button', { name: /Séance faite/ })).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page)).s.done).toEqual({ [TODAY]: true });
  await page.reload();
  await expect(page.getByRole('button', { name: /Séance faite/ })).toBeVisible();
});

test('lance la séance proposée avec ses réglages', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero').getByRole('button', { name: 'Bloc 6' }).click();
  await expect(tab(page, 'Répéter')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#chips [aria-pressed="true"]')).toContainText("6. L'esquive");
  await expect(page.locator('[data-opt="mask"][aria-pressed="true"]')).toHaveText('Un mot sur deux');
});

test('signale les séances en retard', async ({ page }) => {
  await page.goto('/');
  // Aucune séance n'est faite : les 5 jours précédents sont à rattraper.
  await expect(page.locator('.late .item')).toHaveCount(5);
  await page.locator('.late .item').first().getByRole('button', { name: 'Fait' }).click();
  await expect(page.locator('.late .item')).toHaveCount(4);
});
