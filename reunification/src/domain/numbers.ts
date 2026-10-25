/* ---------- nombres écrits en lettres (sans accents ni traits d'union, comme le texte normalisé) ---------- */
const UNITS = [
  'zero',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
];
const TENS: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function below100(n: number): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix ${UNITS[n - 10]}`;
  const d = Math.floor(n / 10),
    r = n % 10;
  if (d < 7) return TENS[d] + (r === 0 ? '' : r === 1 ? ' et un' : ` ${UNITS[r]}`);
  if (d === 7) return `soixante ${r === 1 ? 'et onze' : below100(10 + r)}`;
  if (d === 8) return `quatre vingt${r === 0 ? 's' : ` ${UNITS[r]}`}`;
  return `quatre vingt ${below100(10 + r)}`;
}

function below1000(n: number): string {
  const c = Math.floor(n / 100),
    r = n % 100;
  let s = '';
  if (c) s = `${c > 1 ? `${UNITS[c]} ` : ''}cent${c > 1 && r === 0 ? 's' : ''}`;
  if (r) s += (s ? ' ' : '') + below100(r);
  return s || 'zero';
}

/** 60 → « soixante », 12000 → « douze mille ». Au-delà du million, le nombre reste en chiffres. */
export function numberToWords(n: number): string {
  if (n < 1000) return below1000(n);
  if (n >= 1e6) return String(n);
  const m = Math.floor(n / 1000),
    r = n % 1000;
  return `${m > 1 ? `${below1000(m)} ` : ''}mille${r ? ` ${below1000(r)}` : ''}`;
}
