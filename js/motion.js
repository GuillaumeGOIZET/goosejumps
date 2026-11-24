/* =========================================================
   Micro-interactions qui ont besoin d'un peu de JavaScript
   (le reste des animations est en CSS, dans css/motion.css)

   - Onde au clic : un cercle part de l'endroit touché sur le bouton
   - Oies qui sautent : toucher une oie la fait sauter
   - Entrée d'écran : enterScreen() est appelé par le routeur (app.js)

   Un seul écouteur sur tout le document : ça marche aussi pour les
   boutons créés plus tard par les écrans.
   ========================================================= */

import { sfx } from './sound.js';

// Boutons qui reçoivent l'onde (ils ont overflow: hidden dans motion.css)
const RIPPLE_TARGETS = '.btn, .icon-btn, .type-btn, .level-btn, .pick-btn, .theme-btn, .winner-btn, .chip, .cat-btn, .tab, .dashed-btn';

// Oies qu'on peut faire sauter en les touchant
const JUMP_TARGETS = '.home__mascot, .victory__goose, .turn-banner__avatar, .editor__preview';

// Réglage « Réduire les animations » du téléphone
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function ripple(button, event) {
  const rect = button.getBoundingClientRect();
  // Assez grand pour couvrir tout le bouton, quel que soit l'endroit touché
  const size = Math.max(rect.width, rect.height) * 2;
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.left = `${event.clientX - rect.left - size / 2}px`;
  dot.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.appendChild(dot);
  dot.addEventListener('animationend', () => dot.remove());
}

function jump(element) {
  // On retire la classe puis on la remet pour pouvoir rejouer l'animation
  element.classList.remove('is-jumping');
  void element.offsetWidth; // force le navigateur à « oublier » l'animation précédente
  element.classList.add('is-jumping');
}

document.addEventListener('pointerdown', (event) => {
  // Une oie touchée crie (même si les animations sont réduites)
  const touchedGoose = event.target.closest(JUMP_TARGETS);
  if (touchedGoose) sfx.honk();

  if (reduceMotion.matches) return;

  const button = event.target.closest(RIPPLE_TARGETS);
  if (button && !button.disabled) ripple(button, event);

  const goose = event.target.closest(JUMP_TARGETS);
  if (goose) jump(goose);
});

document.addEventListener('animationend', (event) => {
  // L'animation du saut est sur le <svg> à l'intérieur de l'oie
  const goose = event.target.parentElement;
  if (event.animationName === 'goose-jump' && goose) goose.classList.remove('is-jumping');
});

/** Lance l'animation d'arrivée (cascade) sur l'écran qui vient d'être affiché */
export function enterScreen(root) {
  const screen = root.firstElementChild;
  if (screen) screen.classList.add('screen-enter');
}
