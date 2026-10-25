import { DEMO, expect, FEMME, MINE, stored, tab, test } from './fixtures';

test.use({ saved: { s: { mode: 'lire', roles: [FEMME] } } });

test('montre mes scènes, puis une autre scène avec les puces', async ({ page }) => {
  await page.goto('/');
  await expect(tab(page, 'Lire')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.shead h2')).toHaveText(DEMO.scenes[0].title);
  await expect(page.locator('.ln.me')).toHaveCount(MINE.length);
  await expect(page.locator('.shead').first()).toContainText("Avec L'homme, La femme");
  await page.locator('#chips').getByRole('button', { name: DEMO.scenes[1].title }).click();
  await expect(page.locator('.shead h2')).toHaveText(DEMO.scenes[1].title);
  await expect(page.locator('.ln.me')).toHaveCount(0);
});

test('garde mes notes de jeu, ouvertes quand le texte est redessiné', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('details[data-note]');
  await note.locator('summary').click();
  await note.locator('textarea').fill('Elle hésite jusqu’au bout.');
  expect((await stored(page)).s.notes).toEqual({ [DEMO.scenes[0].title]: 'Elle hésite jusqu’au bout.' });
  const first = page.locator(`.ln[data-i="${MINE[0]}"]`);
  await first.click();
  await first.click();
  await expect(note).toHaveAttribute('open', '');
  await page.reload();
  await expect(page.locator('details[data-note] summary')).toContainText('Elle hésite');
});

test('écoute le passage et l’arrête', async ({ page }) => {
  await page.goto('/');
  await page.locator('#row').getByRole('button', { name: 'Écouter' }).click();
  await expect(page.locator('#status')).toContainText('Lecture du passage');
  await expect(page.locator('.ln.playing')).toHaveCount(1);
  await page.locator('#row').getByRole('button', { name: 'Arrêter' }).click();
  await expect(page.locator('#status')).toContainText("Touche une réplique pour l'entendre.");
  await expect(page.locator('.ln.playing')).toHaveCount(0);
});

test('réécoute mon enregistrement, puis l’efface depuis les réglages', async ({ page }) => {
  await page.goto('/');
  const id = DEMO.lines[MINE[0]].id;
  // Une prise pour ma première réplique, comme après une répétition en « M'enregistrer » : une seconde de silence.
  await page.evaluate(async (key) => {
    const rate = 8000,
      n = rate;
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const text = (o: number, s: string) => {
      for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k));
    };
    text(0, 'RIFF');
    v.setUint32(4, 36 + n, true);
    text(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate, true);
    v.setUint16(32, 1, true);
    v.setUint16(34, 8, true);
    text(36, 'data');
    v.setUint32(40, n, true);
    new Uint8Array(buf, 44).fill(128);
    const blob = new Blob([buf], { type: 'audio/wav' });
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const q = indexedDB.open('reunification', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('rec');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('rec', 'readwrite');
      tx.objectStore('rec').put(blob, key);
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    db.close();
  }, id);
  await page.reload();
  const line = page.locator(`.ln[data-i="${MINE[0]}"]`);
  const myTake = line.getByRole('button', { name: 'Ma version' });
  await expect(myTake).toBeVisible();
  await expect(page.locator('#row').getByRole('button', { name: 'Ma voix' })).toBeVisible();
  await myTake.click();
  await expect(line).toHaveClass(/\bplaying\b/);

  await page.getByRole('button', { name: 'Réglages' }).click();
  page.once('dialog', (d) => d.accept());
  await page.locator('#btnResetRec').click();
  await expect(myTake).toHaveCount(0);
  await page.locator('#btnClose').click();
  await expect(page.locator('#row').getByRole('button', { name: 'Ma voix' })).toHaveCount(0);
});
