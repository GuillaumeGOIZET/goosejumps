/* =========================================================
   Écran de victoire + classement final
   ========================================================= */

import { gooseImg } from '../goose.js';
import { getPlayer, ranking } from '../game.js';
import { esc, bindActions } from '../ui.js';
import { rankingList } from './ranking.js';
import { sfx } from '../sound.js';

// Confettis décoratifs : [gauche %, haut px, couleur, rotation]
const CONFETTI = [
  [8, 40, '#4C8DFF', 20], [22, 120, '#FFD23F', -15], [80, 60, '#FF7EC2', 35],
  [90, 160, '#2FD3B0', -30], [14, 230, '#FF8A1F', 45], [70, 250, '#B89CFF', 10],
  [50, 20, '#2FD3B0', -40], [36, 190, '#FF7EC2', 25], [62, 140, '#FFD23F', -20]
];

export function render(root, app) {
  const state = app.state;
  const winner = getPlayer(state, state.winnerId);

  // Pas de vainqueur (accès direct) : retour au jeu
  if (!winner) {
    app.go('turn');
    return;
  }

  root.innerHTML = `
  <section class="screen victory">
    ${CONFETTI.map(([left, top, color, rot]) =>
      `<span class="confetti" aria-hidden="true" style="left:${left}%;top:${top}px;background:${color};transform:rotate(${rot}deg)"></span>`).join('')}

    <p class="victory__kicker">FINISH!</p>
    <div class="victory__goose">
      ${gooseImg(winner.character, 170)}
    </div>
    <h1 class="victory__title">${esc(winner.name)} wins!</h1>
    <p class="hint hint--center">First goose to reach the FINISH. Well played, everyone!</p>

    <span class="label">Final ranking</span>
    ${rankingList(state, ranking(state))}

    <div class="spacer"></div>
    <div class="victory__actions">
      <button type="button" class="btn" data-action="newGame">PLAY AGAIN</button>
      <button type="button" class="btn btn--cream btn--sm" data-action="home">HOME</button>
    </div>
  </section>`;

  sfx.victory(); // fanfare !

  bindActions(root, {
    newGame() {
      app.newGame();
    },
    home() {
      app.go('home');
    }
  });
}
