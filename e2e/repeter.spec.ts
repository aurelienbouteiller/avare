import type { Page } from '@playwright/test';
import { blockLines, LINES } from '../src/data/scene';
import { dockButton, expect, stored, test } from './fixtures';

test.use({ saved: { s: { mode: 'repeter', block: 1, check: 'manual' } } });

const H1 = blockLines(1).filter((i) => LINES[i].w === 'H');

/** Avance jusqu'à la prochaine réplique d'Harpagon à dire. */
async function toNextH(page: Page) {
  await expect(dockButton(page, 'Suivant').or(dockButton(page, 'Révéler'))).toBeVisible();
  if (await dockButton(page, 'Suivant').isVisible()) await dockButton(page, 'Suivant').click();
  await expect(dockButton(page, 'Révéler')).toBeVisible();
}

test('enchaîne tout un bloc en vérification manuelle', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  await expect(page.locator('body')).toHaveClass(/\brun\b/);
  for (let n = 1; n <= H1.length; n++) {
    await toNextH(page);
    await expect(page.locator('#runbar .count')).toHaveText(`Réplique ${n} sur ${H1.length}`);
    // Réplique masquée par des pièces, puis révélée en entier.
    await expect(page.locator('.ln.cur .coin').first()).toBeVisible();
    await dockButton(page, 'Révéler').click();
    await expect(page.locator('.ln.cur')).toContainText(LINES[H1[n - 1]].t);
    await dockButton(page, "Je l'avais").click();
  }
  await expect(page.getByRole('heading', { name: 'Fin du passage' })).toBeVisible();
  await expect(page.locator('.score b')).toHaveText(`${H1.length} / ${H1.length}`);
  await expect(page.getByText('Sans faute. Bravo !')).toBeVisible();
  const { st, s } = await stored(page);
  expect(H1.every((i) => st[i]?.last === 'ok')).toBe(true);
  expect(s.daily).toEqual({ '2026-10-09': H1.length });
});

test('donne un indice, compte une réplique à revoir, puis ne reprend que celle-ci', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  await toNextH(page);
  await dockButton(page, 'Indice').click();
  await expect(page.locator('.ln.cur .ini').first()).toBeVisible();
  await dockButton(page, 'Révéler').click();
  await dockButton(page, 'À revoir').click();
  await expect(page.locator('#runbar .tally .ko')).toHaveText('1');
  await page.getByRole('button', { name: 'Arrêter la répétition' }).click();

  await expect(
    page
      .locator('#chips')
      .getByRole('button', { name: /Ta santé/ })
      .locator('.badge'),
  ).toHaveText('1');
  await page.getByRole('button', { name: /Seulement mes 1 réplique à revoir/ }).click();
  await dockButton(page, 'Commencer').click();
  await toNextH(page);
  await expect(page.locator('#runbar .count')).toHaveText('Réplique 1 sur 1');
});

test('corrige un jugement avec « Compter juste »', async ({ page }) => {
  await page.goto('/');
  await dockButton(page, 'Commencer').click();
  await toNextH(page);
  await dockButton(page, 'Révéler').click();
  await dockButton(page, 'À revoir').click();
  await toNextH(page);
  // Revenir à la réplique précédente en la touchant.
  await page.locator('.ln.H.past').first().click();
  await expect(page.locator('#runbar .count')).toHaveText(`Réplique 1 sur ${H1.length}`);
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

test.describe('avec la voix de Frosine', () => {
  test.use({ saved: { s: { mode: 'repeter', block: 1, check: 'manual', tts: true, src: 'rec' } } });

  test('laisse finir l’animation d’entrée pendant que Frosine parle, sans la rejouer ensuite', async ({ page }) => {
    await page.goto('/');
    await dockButton(page, 'Commencer').click();
    await dockButton(page, 'Révéler').click();
    await dockButton(page, "Je l'avais").click();
    // Réplique de Frosine : le surlignage du segment lu redessine la réplique pendant son animation d'entrée.
    const cur = page.locator('.ln.cur.F');
    await expect(cur).toBeVisible();
    const anim = await cur.evaluateHandle((el) => el.getAnimations()[0]);
    await expect.poll(() => anim.evaluate((a) => a?.playState)).toBe('finished');
    await expect(cur).toHaveClass(/\bfresh\b/);

    // Réplique d'Harpagon : un indice redessine la réplique sans rejouer l'animation.
    await dockButton(page, 'Passer').click();
    await expect(dockButton(page, 'Révéler')).toBeVisible();
    const h = page.locator('.ln.cur.H');
    await expect.poll(() => h.evaluate((el) => el.getAnimations().length)).toBe(0);
    await dockButton(page, 'Indice').click();
    await expect(h.locator('.ini').first()).toBeVisible();
    expect(await h.evaluate((el) => el.getAnimations().length)).toBe(0);
  });
});

test.describe('en mains libres', () => {
  test.use({ saved: { s: { mode: 'repeter', block: 1, check: 'manual', hands: true } } });

  test('révèle la réplique à la fin du temps, puis passe seul à la suivante', async ({ page }) => {
    await page.goto('/');
    await dockButton(page, 'Commencer').click();
    await expect(page.locator('.ln.cur .timer')).toBeVisible();
    // Temps de la réplique écoulé : elle est révélée, puis la réplique de Frosine suit.
    await expect(page.locator('#status')).toHaveText("Vérifie à l'oreille.", { timeout: 10_000 });
    await expect(page.locator('.ln.cur')).toContainText(LINES[H1[0]].t);
    await expect(page.locator('#status')).toHaveText('Lis la réplique de Frosine.', { timeout: 10_000 });
  });
});
