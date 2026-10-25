/* ---------- types partagés ---------- */

/* pièce */
/** Segment d'une réplique : texte dit, ou didascalie entre parenthèses ou crochets. */
export type Seg = { t: string; d?: undefined } | { d: string; t?: undefined };
export interface Line {
  /** Personnage qui parle (tel qu'écrit dans le texte, en capitales) ; '' : didascalie seule. */
  w: string;
  /** Texte dit, sans les didascalies (retours à la ligne gardés). */
  t: string;
  /** Numéro de scène, à partir de 1. */
  b: number;
  /** Texte complet, didascalies comprises. */
  segs: Seg[];
  /** Identifiant stable (personnage, texte, rang), pour les résultats et les enregistrements. */
  id: string;
}
export interface Scene {
  n: number;
  title: string;
  /** Personnages qui parlent dans la scène, dans l'ordre d'apparition. */
  chars: string[];
}
export interface Play {
  scenes: Scene[];
  lines: Line[];
}
export type Preset = Partial<Pick<Settings, 'mode' | 'block' | 'mask' | 'order' | 'only' | 'wild'>>;

/* réglages */
export const MODES = ['jour', 'lire', 'repeter', 'roles'] as const;
export const MASK_IDS = ['coins', 'initiales', 'moitie', 'visible'] as const;
export const ORDERS = ['scene', 'hasard'] as const;
export const CHECKS = ['manual', 'voix', 'rec'] as const;
export const TOLS = ['stricte', 'normale', 'souple'] as const;
export const THEMES = ['sombre', 'clair', 'auto'] as const;
export type Mode = (typeof MODES)[number];
export type Mask = (typeof MASK_IDS)[number];
type Order = (typeof ORDERS)[number];
export type Check = (typeof CHECKS)[number];
export type Tol = (typeof TOLS)[number];
type Theme = (typeof THEMES)[number];

export interface Settings {
  mode: Mode;
  /** Scène choisie (0 : toutes mes scènes). */
  block: number;
  mask: Mask;
  order: Order;
  check: Check;
  tol: Tol;
  rate: number;
  wild: boolean;
  hands: boolean;
  voice: string;
  /** Les partenaires disent leurs répliques à voix haute. */
  tts: boolean;
  /** Une voix et un timbre différents pour chaque personnage. */
  mix: boolean;
  only: boolean;
  theme: Theme;
  /** Mes rôles : clés `titre de scène|PERSONNAGE` (voir roleKey). */
  roles: string[];
  /** Date de la représentation, AAAA-MM-JJ ('' : non fixée). */
  showDate: string;
  /** Mes notes de jeu, par titre de scène. */
  notes: Record<string, string>;
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
export type Phase = 'idle' | 'empty' | 'partner' | 'await' | 'check' | 'done';
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
  /** Segment de la réplique du partenaire en cours de lecture (-1 : aucun). */
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
  /** Texte collé ou ouvert dans l'écran Rôles, pas encore adopté (null : pas d'import en cours). */
  draft: string | null;
  /** Lecture d'un PDF en cours. */
  importing: boolean;
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
