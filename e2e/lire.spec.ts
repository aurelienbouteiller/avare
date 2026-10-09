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

test('réécoute mon enregistrement, puis l’efface depuis les réglages', async ({ page }) => {
  await page.goto('/');
  // Une prise pour la première réplique, comme après une répétition en « M'enregistrer ».
  await page.evaluate(async () => {
    const blob = await (await fetch('audio/H0/L0_S0.mp3')).blob();
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const q = indexedDB.open('souffleur', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('rec');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('rec', 'readwrite');
      tx.objectStore('rec').put(blob, 0);
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    db.close();
  });
  await page.reload();
  const myTake = page.locator('.ln[data-i="0"]').getByRole('button', { name: 'Ma version' });
  await expect(myTake).toBeVisible();
  await expect(page.locator('#row').getByRole('button', { name: 'Ma voix' })).toBeVisible();
  await myTake.click();
  await expect(page.locator('.ln[data-i="0"]')).toHaveClass(/\bplaying\b/);

  await page.getByRole('button', { name: 'Réglages' }).click();
  page.once('dialog', (d) => d.accept());
  await page.locator('#btnResetRec').click();
  await expect(myTake).toHaveCount(0);
  await page.locator('#btnClose').click();
  await expect(page.locator('#row').getByRole('button', { name: 'Ma voix' })).toHaveCount(0);
});
