/* ---------- noms propres mal transcrits par la reconnaissance vocale ---------- */
// Variantes explicites : un rapprochement approximatif changerait aussi « mariage » en Mariane.
const NAMES: Record<string, RegExp> = {
  Frosine:
    /\b(?:f?rosine|frozine|prosine|crosine|frosinne|frosyne|f?rau?zine|froz?ines?|frosines)\b|\bfro(?:id|s)? (?:zine|sine)\b/gi,
  Mariane: /\bmarie[ -]?anne\b|\bmarianne\b/gi,
};

export function fixNames(said: string) {
  let s = said;
  for (const [n, re] of Object.entries(NAMES)) s = s.replace(re, n);
  return s;
}
