import { expect, FEMME, QUAI, stored, tab, test } from './fixtures';

const PASTED = `# Premier tableau
(Un salon.)
ANNE. Tu es là ?
BRUNO. Depuis longtemps.
ANNE. Je ne t'avais pas vu.

# Second tableau
BRUNO : On y va.
CLAIRE
Pas encore.`;

test('accueille, puis choisit un rôle dans la distribution', async ({ page }) => {
  await page.goto('/');
  await expect(tab(page, "Aujourd'hui")).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.hero h2')).toHaveText('Bienvenue dans la troupe');
  await page.locator('.hero').getByRole('button', { name: 'Importer le texte' }).click();
  await expect(tab(page, 'Rôles')).toHaveAttribute('aria-selected', 'true');

  const femme = page
    .locator('.scene-row')
    .first()
    .getByRole('button', { name: /La femme/ });
  await femme.click();
  await expect(femme).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page)).s.roles).toEqual([FEMME]);
  await expect(page.locator('.cast-card')).toContainText('Tu joues dans 1 scène : 5 répliques à apprendre.');

  await page.getByRole('button', { name: 'Répéter mes scènes' }).click();
  await expect(tab(page, 'Répéter')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.card h2').first()).toHaveText('Toutes mes scènes');
});

test('importe un texte collé, après aperçu, et le garde', async ({ page }) => {
  await page.goto('/');
  await tab(page, 'Rôles').click();
  await page.getByRole('button', { name: 'Coller le texte' }).click();
  await page.locator('#draft').fill(PASTED);
  await expect(page.locator('.text-card')).toContainText('2 scènes · 5 répliques · 3 personnages');
  await expect(page.locator('.preview li').nth(1)).toContainText('Bruno, Claire');
  await page.getByRole('button', { name: 'Utiliser ce texte' }).click();
  await expect(page.locator('.text-card')).toContainText('Texte importé : 2 scènes');
  await page.reload();
  await expect(page.locator('.scene-row')).toHaveCount(2);
  await expect(page.locator('.scene-row').first()).toContainText('1. Premier tableau');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: "Revenir à l'exemple" }).click();
  await expect(page.locator('.scene-row').first()).toContainText(QUAI);
});

test('importe un fichier texte', async ({ page }) => {
  await page.goto('/');
  await tab(page, 'Rôles').click();
  await page
    .locator('#fileText')
    .setInputFiles({ name: 'piece.txt', mimeType: 'text/plain', buffer: Buffer.from(PASTED) });
  await expect(page.locator('#draft')).toHaveValue(PASTED);
  await page.getByRole('button', { name: 'Utiliser ce texte' }).click();
  await expect(page.locator('.scene-row')).toHaveCount(2);
});

test('refuse un texte sans réplique reconnue', async ({ page }) => {
  await page.goto('/');
  await tab(page, 'Rôles').click();
  await page.getByRole('button', { name: 'Coller le texte' }).click();
  await page.locator('#draft').fill('Il était une fois, sans personnage.');
  await expect(page.locator('.text-card')).toContainText('Aucune réplique reconnue');
  await expect(page.getByRole('button', { name: 'Utiliser ce texte' })).toBeDisabled();
});

test('lit le PDF d’une édition : titres, noms en petites capitales, didascalies en italique', async ({
  page,
  browser,
}) => {
  // PDF imprimé par le navigateur, à partir d'un court texte inventé mis en page comme une édition.
  const printer = await browser.newPage();
  await printer.setContent(`<style>body{font:12pt serif} b{font-weight:normal;font-size:10pt}</style>
    <p>LA PIÈCE INVENTÉE</p><p>— le quai —</p><p><i>Un quai de gare, la nuit.</i></p>
    <p><b>L’HOMME</b>. Tu pars ?</p><p><b>LA FEMME</b>. Le train est en retard. <i>Elle sourit.</i></p>
    <p><b>L’HOMME</b>. Je reste.</p><p><b>LA FEMME</b>. Moi aussi.</p><p><i>Noir.</i></p>`);
  const pdf = await printer.pdf();
  await printer.close();

  await page.goto('/');
  await tab(page, 'Rôles').click();
  await page.locator('#fileText').setInputFiles({ name: 'piece.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('#draft')).toHaveValue(/^# Le quai\n/, { timeout: 15_000 });
  await expect(page.locator('#draft')).toHaveValue(/LA FEMME\. Le train est en retard\. \(Elle sourit\.\)/);
  await expect(page.locator('.text-card')).toContainText('1 scène · 4 répliques · 2 personnages');
  await page.getByRole('button', { name: 'Utiliser ce texte' }).click();
  await expect(page.locator('.scene-row')).toHaveCount(1);
  await expect(page.locator('.scene-row')).toContainText('1. Le quai');
});
