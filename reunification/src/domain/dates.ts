/* ---------- dates du calendrier (AAAA-MM-JJ, heure locale) ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
// Midi évite les décalages d'un jour liés aux changements d'heure.
const noon = (d: string) => new Date(`${d}T12:00:00`);

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Nombre de jours d'aujourd'hui à `d` (négatif si `d` est passé). */
export function daysUntil(d: string) {
  return Math.round((noon(d).getTime() - noon(today()).getTime()) / 864e5);
}

export function fmtDate(
  d: string,
  opt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
) {
  return noon(d).toLocaleDateString('fr-FR', opt);
}
