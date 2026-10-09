/* ---------- module virtuel `virtual:clips` : clips MP3 présents dans public/audio/<voix>/ ---------- */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const ID = 'virtual:clips';
const RESOLVED = `\0${ID}`;

/** Identifiants des clips (`L<réplique>_S<segment>`) de chaque voix, triés. */
export function listClips(dir: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    out[e.name] = readdirSync(join(dir, e.name))
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => f.slice(0, -4))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  }
  return out;
}

export function clips(dir = 'public/audio'): Plugin {
  const abs = resolve(dir);
  return {
    name: 'souffleur-clips',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      return `export default ${JSON.stringify(listClips(abs))};`;
    },
    // En dev, un MP3 ajouté ou supprimé met la liste à jour et recharge la page.
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(abs) || !file.endsWith('.mp3')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('unlink', refresh);
    },
  };
}
