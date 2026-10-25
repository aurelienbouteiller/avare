import { test as base, expect, type Page } from '@playwright/test';
import { DEMO_TEXT } from '../src/data/demo';
import { parsePlay } from '../src/domain/parse';

export { expect };

const KEY = 'reunification-v1';
/** Jour fixe des tests. */
export const TODAY = '2026-10-09';

/** Le texte d'exemple, chargé tant qu'aucun texte n'est importé. */
export const DEMO = parsePlay(DEMO_TEXT);
export const QUAI = DEMO.scenes[0].title;
/** Rôle de LA FEMME dans la première scène d'exemple. */
export const FEMME = `${QUAI}|LA FEMME`;
/** Indices de mes répliques (LA FEMME) dans la première scène d'exemple. */
export const MINE = DEMO.lines.flatMap((l, i) => (l.b === 1 && l.w === 'LA FEMME' ? [i] : []));

interface Saved {
  s?: Record<string, unknown>;
  st?: Record<string, unknown>;
}

export const test = base.extend<{ saved: Saved; errors: string[] }>({
  // Données présentes au premier chargement. Voix coupée : les partenaires se lisent, rien ne dépend de la synthèse.
  saved: [{}, { option: true }],
  // Toute erreur JavaScript ou console fait échouer le test.
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page, saved }, use) => {
    await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00`));
    // Seulement si rien n'est enregistré : un rechargement garde ce que le test a changé.
    await page.addInitScript(
      ([k, v]) => {
        if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
      },
      [KEY, JSON.stringify({ v: 1, s: { tts: false, ...saved.s }, st: saved.st ?? {} })] as const,
    );
    await use(page);
  },
});

/** Données sauvegardées par l'appli. */
export const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY) as Promise<{
    s: Record<string, unknown>;
    st: Record<string, { ok: number; ko: number; last: string }>;
  }>;

export const tab = (page: Page, name: string) => page.getByRole('tab', { name });
export const dockButton = (page: Page, name: string) => page.locator('#row').getByRole('button', { name, exact: true });
