/* ---------- timbre de chaque personnage : hauteur de voix et voix du téléphone attribuées ---------- */

const FEMININE = new Set(
  'LA ELLE FEMME MÈRE FILLE SŒUR SOEUR TANTE AMIE ÉPOUSE VEUVE MADAME MADEMOISELLE INFIRMIÈRE SERVEUSE PATRONNE'.split(
    ' ',
  ),
);
const MASCULINE = new Set(
  'LE LUI HOMME PÈRE FILS FRÈRE ONCLE AMI MARI ÉPOUX VEUF MONSIEUR INFIRMIER SERVEUR PATRON GARÇON'.split(' '),
);

function hash(s: string) {
  let h = 0;
  for (let k = 0; k < s.length; k++) h = (Math.imul(h, 31) + s.charCodeAt(k)) | 0;
  return h >>> 0;
}

/** Genre deviné au premier mot qui l'indique (« LA MÈRE DU GARÇON » : féminin), sinon neutre. */
function gender(who: string): 'f' | 'm' | '' {
  for (const w of who.toUpperCase().split(/[\s'’-]+/)) {
    if (FEMININE.has(w)) return 'f';
    if (MASCULINE.has(w)) return 'm';
  }
  return '';
}

const BASE_PITCH = { f: 1.12, m: 0.86, '': 1 };

/**
 * Timbre d'un personnage, toujours le même : hauteur de voix selon le genre deviné, avec un léger écart propre au
 * nom ; slot : rang de la voix du téléphone qui lui est attribuée (modulo le nombre de voix disponibles).
 */
export function timbreOf(who: string) {
  const h = hash(who);
  const jitter = ((h % 11) - 5) / 100;
  return { pitch: BASE_PITCH[gender(who)] + jitter, slot: Math.floor(h / 11) };
}
