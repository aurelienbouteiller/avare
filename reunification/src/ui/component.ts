/* ---------- composant : élément Lit sans Shadow DOM, redessiné quand l'état qu'il lit change ---------- */
import { LitElement, type PropertyValues } from 'lit';
import { track } from '../reactive';

/**
 * Base des composants de l'appli. Le rendu reste dans le DOM de la page (pas de Shadow DOM) : les classes
 * Tailwind, la délégation d'évènements et les tests e2e le voient comme avant. Les signaux lus par `render()`
 * sont suivis, et le moindre changement redemande un rendu, regroupé par Lit en fin de tâche.
 * Défilement et autres effets sur le DOM vont dans `updated()`, qui s'exécute hors du suivi.
 * L'élément hôte ne crée pas de boîte (`display: contents`) : la mise en page est celle de son contenu.
 */
export abstract class Component extends LitElement {
  #stop = () => {};

  protected override createRenderRoot() {
    return this;
  }

  protected override update(changed: PropertyValues) {
    this.#stop();
    // L'erreur d'un rendu est relancée hors du suivi : Lit doit la voir pour accepter le rendu suivant,
    // et les signaux lus avant elle restent suivis.
    let failed: { error: unknown } | undefined;
    this.#stop = track(
      () => {
        try {
          super.update(changed);
        } catch (error) {
          failed = { error };
        }
      },
      () => this.requestUpdate(),
    );
    if (failed) throw failed.error;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add('contents');
    this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#stop();
  }
}
