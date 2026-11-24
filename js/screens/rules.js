/* =========================================================
   Règles du jeu (version courte, en anglais)
   Les nombres viennent de game.js : si on change une règle là-bas,
   cet écran se met à jour tout seul.
   ========================================================= */

import { FINISH, MIN_PLAYERS, MAX_PLAYERS, TIMER_SECONDS, MOVES, BATTLE_WIN_MOVE } from '../game.js';
import { backButton, bindActions, spaces } from '../ui.js';

const signed = (n) => (n > 0 ? `+${n}` : `−${-n}`);

const RULES = [
  {
    title: 'Get ready',
    color: 'var(--text)',
    text: `${MIN_PLAYERS} to ${MAX_PLAYERS} players, one phone on the table. Add your names and customise your goose.`
  },
  {
    title: 'Roll for order',
    color: 'var(--accent)',
    text: 'Everyone rolls the dice once. The highest roll starts. Ties roll again. Move your goose forward by your roll. After that, no more dice!'
  },
  {
    title: 'Your turn',
    color: 'var(--chance)',
    text: 'Tell the app the colour of your space. It already knows where you are, so it suggests the right one.'
  },
  {
    title: 'Web · Cyber · Design · Marketing',
    color: 'var(--web)',
    text: `Pick Easy or Hard. You have ${TIMER_SECONDS} seconds to answer out loud, in English. The other players judge your answer.
      Easy: ${signed(MOVES.easy.right)} / ${signed(MOVES.easy.wrong)}. Hard: ${signed(MOVES.hard.right)} / ${signed(MOVES.hard.wrong)}.`
  },
  {
    title: 'Chance & Special',
    color: 'var(--design)',
    text: 'Draw a card and do what it says. Good luck!'
  },
  {
    title: 'Battle',
    color: 'var(--accent)',
    text: `Challenge a player and pick a theme. First to shout the right answer in English wins and moves forward ${spaces(BATTLE_WIN_MOVE)}.`
  },
  {
    title: 'Win the race',
    color: 'var(--marketing)',
    text: `The first goose to reach FINISH (space ${FINISH}) wins! You can never go back further than START.`
  }
];

export function render(root, app, params) {
  root.innerHTML = `
  <section class="screen rules">
    <div class="topbar">
      ${backButton('back')}
      <h1>How to play</h1>
    </div>
    <ol class="rules-list">
      ${RULES.map((rule, i) => `
        <li class="rule" style="--c: ${rule.color}">
          <span class="rule__num" aria-hidden="true">${i + 1}</span>
          <div>
            <h2 class="rule__title">${rule.title}</h2>
            <p class="rule__text">${rule.text}</p>
          </div>
        </li>`).join('')}
    </ol>
    <button type="button" class="btn" data-action="back">GOT IT!</button>
  </section>`;

  bindActions(root, {
    back() {
      app.go(params.from || 'home');
    }
  });
}
