import { expect, tab, test } from './fixtures';

test.use({ saved: { s: { mode: 'lire' } } });

test('change de bloc avec les puces', async ({ page }) => {
  await page.goto('/');
  await expect(tab(page, 'Lire')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.bhead h2')).toHaveText('Ta santé');
  await page
    .locator('#chips')
    .getByRole('button', { name: /3\. La dot/ })
    .click();
  await expect(page.locator('.bhead h2')).toHaveText('La dot');
  await page
    .locator('#chips')
    .getByRole('button', { name: /Scène entière/ })
    .click();
  await expect(page.locator('.bhead h2')).toHaveCount(6);
});

test('garde la note de jeu ouverte quand le texte est redessiné', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('details[data-note="1"]');
  await note.locator('summary').click();
  await expect(note).toHaveAttribute('open', '');
  await page.locator('.ln[data-i="0"]').click();
  await page.locator('.ln[data-i="0"]').click();
  await expect(note).toHaveAttribute('open', '');
});

test('écoute le passage et l’arrête', async ({ page }) => {
  await page.goto('/');
  await page.locator('#row').getByRole('button', { name: 'Écouter' }).click();
  await expect(page.locator('#status')).toContainText('Lecture du passage');
  await page.locator('#row').getByRole('button', { name: 'Arrêter' }).click();
  await expect(page.locator('#status')).toContainText("Touche une réplique pour l'entendre.");
  await expect(page.locator('.ln.playing')).toHaveCount(0);
});

test('passe à Répéter avec le même bloc', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('#chips')
    .getByRole('button', { name: /2\. Le souper/ })
    .click();
  await page
    .locator('#row')
    .getByRole('button', { name: /Répéter/ })
    .click();
  await expect(tab(page, 'Répéter')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.card h2').first()).toHaveText('Le souper');
});
