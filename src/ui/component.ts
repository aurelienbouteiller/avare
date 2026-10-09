/* ---------- composant : élément Lit sans Shadow DOM, redessiné quand l'état qu'il lit change ---------- */
import { LitElement, type PropertyValues } from 'lit';
import { track } from '../reactive';

/**
 * Base des composants de l'appli. Le rendu reste dans le DOM de la page (pas de Shadow DOM) : les classes
 * Tailwind, la délégation d'évènements et les tests e2e le voient comme avant. Les signaux lus par `render()`
 * sont suivis, et le moindre changement redemande un rendu, regroupé par Lit en fin de tâche.
 * Défilement et autres effets sur le DOM vont dans `updated()`, qui s'exécute hors du suivi.
 */
export abstract class Component extends LitElement {
  #stop = () => {};

  protected override createRenderRoot() {
    return this;
  }

  protected override update(changed: PropertyValues) {
    this.#stop();
    this.#stop = track(
      () => super.update(changed),
      () => this.requestUpdate(),
    );
  }

  override connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#stop();
  }
}
