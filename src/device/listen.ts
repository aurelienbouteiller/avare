/* ---------- reconnaissance vocale ---------- */
import { compare } from '../domain/compare';
import { fixNames } from '../domain/names';
import { control, state } from '../state';
import { SR } from './platform';

// Chrome Android renvoie en mode continu des résultats cumulatifs : chacun reprend toute la phrase depuis le début.
const CUMULATIVE = /Android/i.test(navigator.userAgent);
// Score à partir duquel la réplique est considérée comme complète.
const COMPLETE = 0.97;
// Silence avant de conclure, selon que la réplique semble complète ou non.
const SILENCE_DONE_MS = 800;
const SILENCE_MS = 2300;
// Délai de grâce avant la première parole, et silence au-delà duquel on ne relance plus l'écoute.
const FIRST_WORD_GRACE_MS = 2500;
const GIVE_UP_SILENCE_MS = 4000;
// Durée maximale de l'écoute : un socle plus un temps par mot attendu.
const maxListenMs = (expected: string) => 7000 + expected.split(/\s+/).length * 800;

export interface ListenHandlers {
  /** Transcription partielle, à afficher pendant que l'utilisateur parle. */
  onHeard(text: string): void;
  /** Fin de l'écoute (silence, temps écoulé ou réplique complète) : texte entendu. */
  onDone(said: string): void;
  /** Reconnaissance impossible (micro refusé, réseau) : message à afficher. */
  onUnavailable(notice: string): void;
}

function transcript(e: SpeechRecognitionEvent) {
  if (CUMULATIVE) return e.results[e.results.length - 1][0].transcript;
  let s = '';
  for (let k = 0; k < e.results.length; k++) s += ` ${e.results[k][0].transcript}`;
  return s;
}

// Message affiché quand l'erreur rend la reconnaissance inutilisable ; '' pour une erreur passagère (silence…).
function unavailableNotice(error: SpeechRecognitionErrorCode) {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'Micro refusé : vérification manuelle.';
  if (error === 'network') return 'Reconnaissance vocale indisponible (réseau) : vérification manuelle.';
  return '';
}

function createRecognition() {
  if (!SR) return null;
  const r = new SR();
  r.lang = 'fr-FR';
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;
  return r;
}

/**
 * Écoute la réplique `expected` ; token : jeton de séquence, l'écoute s'arrête dès qu'il change.
 * Le navigateur coupe régulièrement la reconnaissance : elle est relancée tant que l'utilisateur parle et que la
 * réplique n'est pas complète, en gardant le texte déjà entendu.
 */
export function listen(expected: string, token: number, h: ListenHandlers) {
  const startedAt = Date.now(),
    maxMs = maxListenMs(expected);
  let before = '', // texte des sessions de reconnaissance précédentes
    current = '', // texte de la session en cours
    lastSpeech = Date.now() + FIRST_WORD_GRACE_MS,
    done = false,
    silenceTimer: ReturnType<typeof setTimeout> | undefined,
    recognition: SpeechRecognition | null = null;

  const heard = () => fixNames(`${before} ${current}`.replace(/\s+/g, ' ').trim());
  const complete = () => compare(expected, heard()).score >= COMPLETE;

  const end = () => {
    done = true;
    clearTimeout(silenceTimer);
    clearTimeout(hardTimer);
    state.listening = false;
    try {
      recognition?.abort();
    } catch {}
  };
  const finish = () => {
    if (done) return;
    const said = heard();
    end();
    control.listener = null;
    if (token === control.token) h.onDone(said);
  };
  const keepListening = () =>
    Date.now() - startedAt < maxMs && !complete() && Date.now() - lastSpeech < GIVE_UP_SILENCE_MS;

  const open = () => {
    const r = createRecognition();
    if (!r) return finish();
    recognition = r;
    r.onresult = (e) => {
      current = transcript(e);
      lastSpeech = Date.now();
      h.onHeard(heard());
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(finish, complete() ? SILENCE_DONE_MS : SILENCE_MS);
    };
    r.onerror = (e) => {
      const notice = unavailableNotice(e.error);
      if (!notice) return;
      end();
      control.listener = null;
      h.onUnavailable(notice);
    };
    r.onend = () => {
      if (done || token !== control.token) return;
      before = heard();
      current = '';
      if (keepListening()) restart();
      else finish();
    };
    r.start();
  };
  const restart = () => {
    try {
      open();
    } catch {
      finish();
    }
  };

  state.listening = true;
  const hardTimer = setTimeout(finish, maxMs);
  control.listener = { abort: end };
  restart();
}
