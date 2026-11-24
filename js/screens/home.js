/* =========================================================
   Écran d'accueil (maquette Main)
   PLAY / RULES, ou CONTINUE / NEW GAME si une partie est en cours.
   ========================================================= */

import { gooseSVG } from '../goose.js';
import { bindActions } from '../ui.js';
import { hasGameInProgress } from '../state.js';
import { soundButton } from '../sound.js';
import { installButton } from '../install.js';

export function render(root, app) {
  const inProgress = hasGameInProgress(app.state);

  root.innerHTML = `
  <section class="screen home">
    <div class="deco" style="top:-60px;right:-70px;width:220px;height:220px"></div>
    <div class="deco" style="bottom:120px;left:-90px;width:200px;height:200px"></div>
    ${soundButton('home__sound')}

    <p class="home__kicker">ENGLISH GAME · 2026</p>

    <h1 class="home__title">
      <span class="home__goose">GOOSE</span>
      <span class="home__jumps">JUMPS</span>
    </h1>

    <div class="home__mascot">
      ${gooseSVG({ color: '#FFFFFF', hat: 'top', size: 200, wing: true, shadow: true })}
    </div>

    <div class="home__pills">
      <span class="pill" style="--c: var(--web)">CODE</span>
      <span class="pill" style="--c: var(--cyber)">CYBER SECURITY</span>
      <span class="pill" style="--c: var(--design)">DESIGN</span>
      <span class="pill" style="--c: var(--marketing)">MARKETING</span>
    </div>

    <div class="spacer"></div>

    <div class="home__actions">
      ${inProgress
        ? `<button type="button" class="btn home__play" data-action="continue">CONTINUE</button>
           <button type="button" class="btn btn--cream" data-action="newGame">NEW GAME</button>`
        : `<button type="button" class="btn home__play" data-action="play">PLAY</button>`}
      <button type="button" class="btn btn--cream" data-action="rules">RULES</button>
    </div>
    ${installButton()}
    <p class="home__credits">Guillaume · Ziad · Mikael · Chiara</p>
  </section>`;

  bindActions(root, {
    play() {
      // Partie terminée : on en relance une avec les mêmes joueurs
      if (app.state.phase === 'finished') app.newGame();
      else app.go('players');
    },
    continue() {
      app.go(app.state.phase === 'order' ? 'order' : 'turn');
    },
    newGame() {
      if (confirm('Start a new game? The current game will be lost.')) app.newGame();
    },
    rules() {
      app.go('rules', { from: 'home' });
    }
  });
}
