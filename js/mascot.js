/* =========================================================
   L'oie de l'accueil, qu'on peut taper
   - Chaque tape : petite réaction (elle penche à gauche, à droite ou s'écrase),
     un « pow » à l'endroit touché, et un cri de plus en plus aigu (elle s'énerve).
   - Trop de tapes d'affilée : elle tombe KO, des étoiles tournent
     au-dessus de sa tête, puis elle se relève toute seule.

   Les animations sont dans css/screens.css (section « Oie de l'accueil »),
   les sons dans js/sound.js (bop, honk, ko, getUp).
   ========================================================= */

import { sfx } from './sound.js';

// ---------- Réglages ----------
const KO_HITS = 6;           // nombre de tapes pour mettre l'oie KO…
const HIT_WINDOW_MS = 3000;  // …en moins de 3 secondes
const FALL_MS = 600;         // durée de la chute
const KO_MS = 2000;          // temps passé par terre avant de se relever

const HIT_ANIMATIONS = ['hit-left', 'hit-right', 'hit-squash'];

// « Pow » dessiné en SVG (étoile d'impact orange)
const POW_SVG = `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
  <path d="M20 2 L24 13 L36 9 L28 19 L38 27 L25 26 L22 38 L17 27 L5 31 L12 21 L3 12 L15 14 Z"
        fill="#FFD23F" stroke="#120C26" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

/**
 * Rend l'oie `button` « tapable ».
 * Renvoie une fonction de nettoyage (à appeler quand on quitte l'écran).
 */
export function attachMascot(button) {
  let hits = [];      // heure de chaque tape récente
  let ko = false;
  let timer = null;

  // Relance une animation CSS même si c'est la même que la précédente
  function play(className) {
    button.classList.remove(...HIT_ANIMATIONS, 'is-getting-up');
    void button.offsetWidth; // force le navigateur à « oublier » l'animation précédente
    button.classList.add(className);
  }

  // Petite étoile « pow » à l'endroit touché (au centre si on utilise le clavier)
  function pow(event) {
    const rect = button.getBoundingClientRect();
    const fromKeyboard = event.detail === 0;
    const x = fromKeyboard ? rect.width / 2 : event.clientX - rect.left;
    const y = fromKeyboard ? rect.height / 3 : event.clientY - rect.top;
    const star = document.createElement('span');
    star.className = 'mascot__pow';
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.rotate = `${Math.round(Math.random() * 90 - 45)}deg`;
    star.innerHTML = POW_SVG;
    button.appendChild(star);
    star.addEventListener('animationend', () => star.remove());
  }

  function knockOut() {
    ko = true;
    hits = [];
    button.classList.remove(...HIT_ANIMATIONS);
    button.classList.add('is-ko');
    button.setAttribute('aria-label', 'Sir Honk is knocked out!');
    sfx.ko();
    timer = setTimeout(getUp, FALL_MS + KO_MS);
  }

  function getUp() {
    button.classList.remove('is-ko');
    play('is-getting-up');
    button.setAttribute('aria-label', 'Poke Sir Honk');
    sfx.getUp();
    ko = false;
  }

  button.addEventListener('click', (event) => {
    if (ko) return; // par terre : elle ne sent plus rien
    const now = Date.now();
    hits = hits.filter((time) => now - time < HIT_WINDOW_MS);
    hits.push(now);
    pow(event);

    if (hits.length >= KO_HITS) {
      knockOut();
      return;
    }
    // Réaction au hasard, et un cri de plus en plus aigu
    play(HIT_ANIMATIONS[Math.floor(Math.random() * HIT_ANIMATIONS.length)]);
    sfx.bop();
    sfx.honk(1 + hits.length * 0.1);
  });

  return () => clearTimeout(timer);
}
