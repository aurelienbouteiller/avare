/* ---------- types partagés ---------- */

/* scène */
type Speaker = 'H' | 'F';
/** Un numéro de bloc, ou une réplique : [qui, texte, 'fin' pour la dernière]. */
export type RawEntry = number | readonly [Speaker, string] | readonly [Speaker, string, 'fin'];
/** Segment d'une réplique de Frosine : texte dit, ou didascalie entre accolades. */
export type Seg = { t: string; d?: undefined } | { d: string; t?: undefined };
export interface Line {
  w: Speaker;
  t: string;
  b: number;
  end: boolean;
  segs: Seg[] | null;
}
export interface Block {
  n: number;
  label: string;
  short: string;
}
export interface Note {
  obj: string;
  jeu: string;
}
export type Preset = Partial<Pick<Settings, 'mode' | 'block' | 'mask' | 'order' | 'check' | 'only' | 'wild'>>;
export interface PlanDay {
  d: string;
  t: string;
  x: string;
  go: { l: string; p: Preset }[];
}

/* réglages */
export const MODES = ['jour', 'lire', 'repeter'] as const;
export const MASK_IDS = ['coins', 'initiales', 'moitie', 'visible'] as const;
export const ORDERS = ['scene', 'hasard'] as const;
export const CHECKS = ['manual', 'voix', 'rec'] as const;
export const TOLS = ['stricte', 'normale', 'souple'] as const;
export const SRCS = ['rec', 'tts'] as const;
export const BANKS = ['F0', 'F1', 'F2', 'F3'] as const;
export const THEMES = ['sombre', 'clair', 'auto'] as const;
export type Mode = (typeof MODES)[number];
export type Mask = (typeof MASK_IDS)[number];
type Order = (typeof ORDERS)[number];
export type Check = (typeof CHECKS)[number];
export type Tol = (typeof TOLS)[number];
type Src = (typeof SRCS)[number];
/** Voix enregistrée de Frosine (F*) ou modèle d'Harpagon (H0). */
type Bank = (typeof BANKS)[number];
type Theme = (typeof THEMES)[number];

export interface Settings {
  mode: Mode;
  block: number;
  mask: Mask;
  order: Order;
  check: Check;
  tol: Tol;
  rate: number;
  wild: boolean;
  hands: boolean;
  voice: string;
  tts: boolean;
  only: boolean;
  src: Src;
  fv: Bank;
  theme: Theme;
  /** Séances faites, par date AAAA-MM-JJ. */
  done: Record<string, true>;
  /** Nombre de répliques travaillées, par date AAAA-MM-JJ. */
  daily: Record<string, number>;
}
export type Mark = 'ok' | 'ko';
export interface Stat {
  ok: number;
  ko: number;
  last: Mark | '';
}

/* exécution */
export type Phase = 'idle' | 'empty' | 'frosine' | 'await' | 'check' | 'done';
export interface CompareResult {
  score: number;
  disp: string[];
  dispOk: boolean[];
  said: string;
}
/** Évènement non standard de Chrome pour proposer l'installation de la PWA. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
/** État affiché : chaque champ est observé, le modifier redessine ce qui en dépend. */
export interface RuntimeState {
  seq: number[];
  pos: number;
  phase: Phase;
  curMask: Mask;
  tally: { ok: number; ko: number };
  marks: Record<number, Mark>;
  playingIdx: number;
  /** Segment de la réplique de Frosine en cours de lecture (-1 : aucun). */
  seg: number;
  result: CompareResult | null;
  notice: string;
  passage: boolean;
  listening: boolean;
  heard: string;
  voiceOff: boolean;
  recording: boolean;
  /** Début du minuteur des mains libres (0 : aucun) et sa durée. */
  timerAt: number;
  timerMs: number;
  online: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  offlineReady: boolean;
}
/** Mécanique de l'exécution, jamais affichée. */
export interface Control {
  /** Jeton de séquence : toute lecture en cours s'arrête quand il change. */
  token: number;
  timerId: ReturnType<typeof setTimeout> | undefined;
  listener: { abort(): void } | null;
  recSaved: Promise<void>;
}

/** Vrai si `v` fait partie de la liste de valeurs autorisées. */
export const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);
