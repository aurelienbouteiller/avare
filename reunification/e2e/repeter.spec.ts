import type { Page } from '@playwright/test';
import { DEMO, dockButton, expect, FEMME, MINE, stored, TODAY, test } from './fixtures';

test.use({ saved: { s: { mode: 'repeter', block: 1, check: 'manual', roles: [FEMME] } } });

/** Avance jusqu'à ma prochaine réplique à dire. */
async function toMine(page: Page) {
  await expect(dockButton(page, 'Suivant').or(dockButton(page, 'Révéler'))).toBeVisible();
  if (await dockButton(page, 'Suivant').isVisible()) await dockButton(page, 'Suivant').click();
  await expect(dockButton(page, 'Révéler')).toBeVisible();
}

test('enchaîne toute une scène en vérification manuelle', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  // Pendant la répétition, la barre de progression remplace les onglets.
  await expect(page.locator('#runbar')).toBeVisible();
  await expect(page.getByRole('tablist')).toBeHidden();
  await expect(page.locator('#status')).toHaveText("Lis la réplique de L'homme.");
  for (let n = 1; n <= MINE.length; n++) {
    await toMine(page);
    await expect(page.locator('#runbar .count')).toHaveText(`Réplique ${n} sur ${MINE.length}`);
    // Réplique masquée par des pastilles, puis révélée en entier.
    await expect(page.locator('.ln.cur .coin').first()).toBeVisible();
    await dockButton(page, 'Révéler').click();
    await expect(page.locator('.ln.cur')).toContainText(DEMO.lines[MINE[n - 1]].t.split('\n')[0]);
    await dockButton(page, "Je l'avais").click();
  }
  await expect(page.getByRole('heading', { name: 'Fin du passage' })).toBeVisible();
  await expect(page.locator('.score b')).toHaveText(`${MINE.length} / ${MINE.length}`);
  await expect(page.getByText('Sans faute. Bravo !')).toBeVisible();
  const { st, s } = await stored(page);
  expect(MINE.every((i) => st[DEMO.lines[i].id]?.last === 'ok')).toBe(true);
  expect(s.daily).toEqual({ [TODAY]: MINE.length });
});

test('montre la didascalie entre deux répliques', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  for (let n = 0; n < 2; n++) {
    await toMine(page);
    await dockButton(page, 'Révéler').click();
    await dockButton(page, "Je l'avais").click();
  }
  await expect(page.locator('.did').filter({ hasText: 'Un temps.' })).toBeVisible();
});

test('donne un indice, compte une réplique à revoir, puis ne reprend que celle-ci', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  await toMine(page);
  await dockButton(page, 'Indice').click();
  await expect(page.locator('.ln.cur .ini').first()).toBeVisible();
  await dockButton(page, 'Révéler').click();
  await dockButton(page, 'À revoir').click();
  await expect(page.locator('#runbar .tally .ko')).toHaveText('1');
  await page.getByRole('button', { name: 'Arrêter la répétition' }).click();

  await expect(page.locator('#chips').getByRole('button', { name: DEMO.scenes[0].title }).locator('.badge')).toHaveText(
    '1',
  );
  await page.getByRole('button', { name: /Seulement mes 1 réplique à revoir/ }).click();
  await dockButton(page, 'Commencer').click();
  await toMine(page);
  await expect(page.locator('#runbar .count')).toHaveText('Réplique 1 sur 1');
});

test('corrige un jugement avec « Compter juste »', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  await toMine(page);
  await dockButton(page, 'Révéler').click();
  await dockButton(page, 'À revoir').click();
  await toMine(page);
  // Revenir à la réplique précédente en la touchant.
  await page.locator('.ln.me.past').first().click();
  await expect(page.locator('#runbar .count')).toHaveText(`Réplique 1 sur ${MINE.length}`);
  await dockButton(page, 'Révéler').click();
  await dockButton(page, "Je l'avais").click();
  await expect(page.locator('#runbar .tally .ok')).toHaveText('1');
  await expect(page.locator('#runbar .tally .ko')).toHaveText('0');
});

test('garde les réglages de séance', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-opt="order"][data-val="hasard"]').click();
  await page.locator('[data-opt="mask"][data-val="initiales"]').click();
  expect((await stored(page)).s).toMatchObject({ order: 'hasard', mask: 'initiales' });
  await page.reload();
  await expect(page.locator('[data-opt="mask"][aria-pressed="true"]')).toHaveText('Initiales');
});

test.describe('sans rôle dans la scène', () => {
  test.use({ saved: { s: { mode: 'repeter', block: 2, roles: [FEMME] } } });

  test('propose de choisir ses rôles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.not-cast h2')).toHaveText('Tu ne joues pas ici');
    await dockButton(page, 'Choisir mes rôles').click();
    await expect(page.locator('.cast-card')).toBeVisible();
  });
});

test.describe('en mains libres', () => {
  test.use({ saved: { s: { mode: 'repeter', block: 1, check: 'manual', hands: true, roles: [FEMME] } } });

  test('révèle la réplique à la fin du temps, puis passe seul à la suivante', async ({ page }) => {
    await page.goto('/');
    await dockButton(page, 'Commencer').click();
    await dockButton(page, 'Suivant').click();
    await expect(page.locator('.ln.cur .timer')).toBeVisible();
    // La barre de temps se remplit.
    const bar = page.locator('.ln.cur .timer i');
    await expect.poll(() => bar.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0);
    // Temps de la réplique écoulé : elle est révélée, puis la réplique du partenaire suit.
    await expect(page.locator('#status')).toHaveText("Vérifie à l'oreille.", { timeout: 10_000 });
    await expect(page.locator('.ln.cur')).toContainText(DEMO.lines[MINE[0]].t);
    await expect(page.locator('#status')).toHaveText("Lis la réplique de L'homme.", { timeout: 10_000 });
  });
});
