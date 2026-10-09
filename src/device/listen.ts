import { compare, fixNames } from '../domain/compare';
import { state } from '../state';
import { SR } from './platform';

/* ---------- reconnaissance vocale ---------- */
// Chrome Android renvoie en mode continu des résultats cumulatifs : chacun reprend toute la phrase depuis le début.
const CUMULATIVE = /Android/i.test(navigator.userAgent);
export interface ListenHandlers {
  /** Le micro écoute. */
  onStart(): void;
  /** Transcription partielle, à afficher pendant que l'utilisateur parle. */
  onHeard(text: string): void;
  /** Fin de l'écoute (silence, temps écoulé ou réplique complète) : texte entendu. */
  onDone(said: string): void;
  /** Reconnaissance impossible (micro refusé, réseau) : message à afficher. */
  onUnavailable(notice: string): void;
}
// Écoute la réplique `expected` ; tok : jeton de séquence, l'écoute s'arrête dès qu'il change.
export function listen(expected: string, tok: number, h: ListenHandlers) {
  const t0 = Date.now(),
    words = expected.split(/\s+/).length,
    maxMs = 7000 + words * 800;
  let prev = '',
    sess = '',
    lastSpeech = Date.now() + 2500,
    done = false,
    silenceT: ReturnType<typeof setTimeout> | undefined,
    hardT: ReturnType<typeof setTimeout> | undefined,
    r: SpeechRecognition | null = null;
  state.LISTENING = true;
  h.onStart();
  const text = () => fixNames(`${prev} ${sess}`.replace(/\s+/g, ' ').trim());
  const end = () => {
    done = true;
    clearTimeout(silenceT);
    clearTimeout(hardT);
    state.LISTENING = false;
    try {
      r?.abort();
    } catch {}
  };
  const finish = () => {
    if (done) return;
    const said = text();
    end();
    state.LISTEN = null;
    if (tok !== state.RUN) return;
    h.onDone(said);
  };
  const open = () => {
    if (!SR) return finish();
    const rec = new SR();
    r = rec;
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      if (CUMULATIVE) sess = e.results[e.results.length - 1][0].transcript;
      else {
        sess = '';
        for (let k = 0; k < e.results.length; k++) sess += ` ${e.results[k][0].transcript}`;
      }
      lastSpeech = Date.now();
      const heard = text();
      h.onHeard(heard);
      clearTimeout(silenceT);
      const sc = compare(expected, heard).score;
      silenceT = setTimeout(finish, sc >= 0.97 ? 800 : 2300);
    };
    rec.onerror = (e) => {
      const notice =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Micro refusé : vérification manuelle.'
          : e.error === 'network'
            ? 'Reconnaissance vocale indisponible (réseau) : vérification manuelle.'
            : '';
      if (notice) {
        end();
        state.LISTEN = null;
        h.onUnavailable(notice);
      }
    };
    rec.onend = () => {
      if (done || tok !== state.RUN) return;
      prev = text();
      sess = '';
      const sc = compare(expected, text()).score;
      if (Date.now() - t0 < maxMs && sc < 0.97 && Date.now() - lastSpeech < 4000) {
        try {
          open();
        } catch {
          finish();
        }
      } else finish();
    };
    try {
      rec.start();
    } catch {
      finish();
    }
  };
  hardT = setTimeout(finish, maxMs);
  state.LISTEN = { abort: end };
  open();
}
