import { DEMO, expect, FEMME, MINE, tab, test } from './fixtures';

test.describe('avec un rôle et une date', () => {
  test.use({ saved: { s: { roles: [FEMME], showDate: '2026-10-16' } } });

  test('affiche le compte à rebours et propose de découvrir la scène', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .jj')).toHaveText('J-7');
    await expect(page.locator('.hero h2')).toHaveText(`Découvrir : ${DEMO.scenes[0].title}`);
    await expect(page.locator('#dock')).toBeHidden();
  });

  test('lance la séance proposée avec ses réglages', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero').getByRole('button', { name: 'Apprendre' }).click();
    await expect(tab(page, 'Répéter')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#chips [aria-pressed="true"]')).toContainText(DEMO.scenes[0].title);
    await expect(page.locator('[data-opt="mask"][aria-pressed="true"]')).toHaveText('Un mot sur deux');
  });
});

test.describe('avec une réplique à revoir', () => {
  test.use({
    saved: {
      s: { roles: [FEMME], daily: { '2026-10-08': 3, '2026-10-09': 2 } },
      st: { [DEMO.lines[MINE[1]].id]: { ok: 0, ko: 1, last: 'ko' } },
    },
  });

  test('propose de la revoir seule, et montre la régularité', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero h2')).toHaveText(`Revoir : ${DEMO.scenes[0].title}`);
    await expect(page.locator('.hero')).toContainText("2 répliques travaillées aujourd'hui");
    await expect(page.locator('.streak')).toContainText('Tu as répété 2 jours sur les 14 derniers.');
    await page.locator('.hero').getByRole('button', { name: 'Les répliques à revoir' }).click();
    await expect(page.getByRole('button', { name: /Seulement mes 1 réplique à revoir/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
