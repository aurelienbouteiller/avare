import { execSync } from 'node:child_process';
import { expect, stored, tab, test } from './fixtures';

test('applique le thème choisi dès le chargement suivant', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.locator('#optTheme').getByRole('button', { name: 'Clair' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Fermer' }).click();
  // Le script inline applique le thème avant le premier rendu : pas de flash sombre.
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('html[data-theme]', { state: 'attached' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('enregistre la voix de Frosine choisie', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.locator('#optFv').selectOption('F3');
  expect((await stored(page)).s.fv).toBe('F3');
});

test('fonctionne hors ligne une fois chargée', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await context.setOffline(true);
  await page.reload();
  await tab(page, 'Lire').click();
  await expect(page.locator('.bhead h2')).toHaveText('Ta santé');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await expect(page.locator('#offlineInfo')).toContainText('Disponible hors ligne');
});

test('affiche le commit construit dans les réglages', async ({ page }) => {
  const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  await page.goto('/');
  await page.getByRole('button', { name: 'Réglages' }).click();
  const link = page.locator('#versionInfo a');
  await expect(link).toHaveText(sha.slice(0, 7));
  await expect(link).toHaveAttribute('href', `https://github.com/aurelienbouteiller/avare/commit/${sha}`);
  await expect(page.locator('#versionInfo')).toContainText('construite le');
});
