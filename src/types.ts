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
type Mode = (typeof MODES)[number];
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
type Mark = 'ok' | 'ko';
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
export interface RuntimeState {
  /** Jeton de séquence : toute lecture en cours s'arrête quand il change. */
  RUN: number;
  seq: number[];
  pos: number;
  phase: Phase;
  curMask: Mask;
  runRes: { ok: number; ko: number };
  runMarks: Record<number, Mark>;
  timerId: ReturnType<typeof setTimeout> | undefined;
  playingIdx: number;
  /** Segment de la réplique de Frosine en cours de lecture (-1 : aucun). */
  seg: number;
  RESULT: CompareResult | null;
  NOTICE: string;
  PASSAGE: boolean;
  LASTSCROLL: string;
  LISTEN: { abort(): void } | null;
  LISTENING: boolean;
  HEARD: string;
  VOICE_OFF: boolean;
  RECORDING: boolean;
  REC_SAVED: Promise<void>;
  INSTALL: BeforeInstallPromptEvent | null;
  OFFLINE_READY: boolean;
}

/** Vrai si `v` fait partie de la liste de valeurs autorisées. */
export const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);
