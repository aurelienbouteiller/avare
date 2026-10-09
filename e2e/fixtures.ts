import { test as base, expect, type Page } from '@playwright/test';

export { expect };
export const KEY = 'souffleur-harpagon-v1';
/** Jour fixe des tests : J-7, séance « Bloc 6 et enchaînement » du plan. */
export const TODAY = '2026-10-09';

interface Saved {
  s?: Record<string, unknown>;
  st?: Record<string, unknown>;
}

export const test = base.extend<{ saved: Saved; errors: string[] }>({
  // Données présentes au premier chargement. Voix coupée : Frosine se lit, rien ne dépend de la synthèse vocale.
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
      [KEY, JSON.stringify({ s: { tts: false, ...saved.s }, st: saved.st ?? {} })] as const,
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
