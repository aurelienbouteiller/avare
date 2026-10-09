import { S } from './store.js';
import { state } from './state.js';
import { LINES } from './data/scene.js';
import { compare, fixNames } from './compare.js';
import { evaluate, handsTimer } from './engine.js';
import { render, renderDock } from './render.js';

/* ---------- reconnaissance vocale ---------- */
export const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
// Chrome Android renvoie en mode continu des résultats cumulatifs : chacun reprend toute la phrase depuis le début.
const CUMULATIVE = /Android/i.test(navigator.userAgent);
export function listen(i, tok) {
  const L = LINES[i],
    t0 = Date.now(),
    words = L.t.split(/\s+/).length,
    maxMs = 7000 + words * 800;
  let prev = '',
    sess = '',
    lastSpeech = Date.now() + 2500,
    done = false,
    silenceT = null,
    hardT = null,
    r = null;
  state.LISTENING = true;
  state.HEARD = '';
  renderDock();
  const text = () => fixNames((prev + ' ' + sess).replace(/\s+/g, ' ').trim());
  const end = () => {
    done = true;
    clearTimeout(silenceT);
    clearTimeout(hardT);
    state.LISTENING = false;
    try {
      r && r.abort();
    } catch (e) {}
  };
  const finish = () => {
    if (done) return;
    const said = text();
    end();
    state.LISTEN = null;
    if (tok !== state.RUN) return;
    evaluate(i, said);
  };
  const open = () => {
    r = new SR();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      if (CUMULATIVE) sess = e.results[e.results.length - 1][0].transcript;
      else {
        sess = '';
        for (let k = 0; k < e.results.length; k++) sess += ' ' + e.results[k][0].transcript;
      }
      lastSpeech = Date.now();
      state.HEARD = text();
      showHeard();
      clearTimeout(silenceT);
      const sc = compare(L.t, state.HEARD).score;
      silenceT = setTimeout(finish, sc >= 0.97 ? 800 : 2300);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        end();
        state.LISTEN = null;
        state.VOICE_OFF = true;
        state.NOTICE = 'Micro refusé : vérification manuelle.';
        if (tok === state.RUN) {
          render();
          if (S.hands) handsTimer(L);
        }
      } else if (e.error === 'network') {
        end();
        state.LISTEN = null;
        state.VOICE_OFF = true;
        state.NOTICE = 'Reconnaissance vocale indisponible (réseau) : vérification manuelle.';
        if (tok === state.RUN) {
          render();
          if (S.hands) handsTimer(L);
        }
      }
    };
    r.onend = () => {
      if (done || tok !== state.RUN) return;
      prev = text();
      sess = '';
      const sc = compare(L.t, text()).score;
      if (Date.now() - t0 < maxMs && sc < 0.97 && Date.now() - lastSpeech < 4000) {
        try {
          open();
        } catch (err) {
          finish();
        }
      } else finish();
    };
    try {
      r.start();
    } catch (err) {
      finish();
    }
  };
  hardT = setTimeout(finish, maxMs);
  state.LISTEN = { abort: end };
  open();
}
function showHeard() {
  const el = document.querySelector('.ln.cur .heard');
  if (el) el.textContent = state.HEARD ? "J'entends : « " + state.HEARD + ' »' : '';
}
