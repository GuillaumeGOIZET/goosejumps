/* =========================================================
   Écran « Roll for order » (maquette Order)
   Chaque joueur lance le dé une fois. Le plus haut commence.
   En cas d'égalité, seuls les joueurs à égalité relancent.
   Le 1er lancer = case de départ. Ensuite, plus de dé !
   ========================================================= */

import { avatar } from '../goose.js';
import { rollDie, nextRoller, isTied, orderFromRolls } from '../game.js';
import { esc, backButton, bindActions } from '../ui.js';

const ROLL_ANIMATION_MS = 700;

// Position des points sur une face de dé (grille 3x3 dans un carré de 100)
const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]]
};

function dieSVG(value) {
  const pips = (PIPS[value] || [])
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#120C26"/>`)
    .join('');
  return `<svg viewBox="0 0 100 100" width="88" height="88" aria-hidden="true">
    <rect x="4" y="4" width="92" height="92" rx="20" fill="#FFF6E5" stroke="#120C26" stroke-width="6"/>
    ${pips}
  </svg>`;
}

export function render(root, app) {
  const state = app.state;
  let rolling = false;
  let shownValue = null;  // valeur affichée sur le gros dé
  let lastRollerId = null;
  let timer = null;

  function draw() {
    const players = state.players;
    const rolls = state.rolls;
    const next = nextRoller(players, rolls);
    const done = next === null && !rolling;

    // Pendant le lancer, la liste reste dans l'ordre des joueurs
    const list = done ? orderFromRolls(players, rolls) : players;
    const nextPlayer = players.find((p) => p.id === next);

    const rows = list.map((p, index) => {
      const mine = rolls[p.id] || [];
      const first = done && index === 0;
      let note;
      if (mine.length === 0) {
        note = p.id === next ? 'Your turn to roll' : 'Waiting…';
      } else if (!done && isTied(players, rolls, p.id)) {
        note = p.id === next ? 'Tie! Roll again' : 'Tie! Waiting to roll again';
      } else {
        note = `Starts on space ${mine[0]}`;
        if (mine.length > 1) note += ` · tie-break ${mine.slice(1).join(', ')}`;
      }
      const isRolling = rolling && p.id === lastRollerId && mine.length === 1;
      return `
      <li class="order-row${first ? ' order-row--first' : ''}">
        <span class="order-row__rank">${done ? index + 1 + '.' : ''}</span>
        ${avatar(p, 48, { size: 40 })}
        <div class="order-row__text">
          <span class="order-row__name">${esc(p.name)}</span>
          <span class="order-row__note">${note}</span>
        </div>
        <div class="order-row__roll${isRolling ? ' is-rolling' : ''}" aria-label="Roll: ${mine[0] || 'not yet'}">
          ${mine.length ? (isRolling ? shownValue : mine[0]) : '–'}
        </div>
      </li>`;
    }).join('');

    const lastRoller = players.find((p) => p.id === lastRollerId);

    root.innerHTML = `
    <section class="screen order">
      <div class="topbar">
        ${backButton('back')}
        <h1>Roll for order</h1>
      </div>
      <p class="hint">Highest roll plays first. Your roll is also your first move from START. After this, no more dice!</p>

      <ol class="order-list">${rows}</ol>

      <div class="spacer"></div>

      <div class="die-zone" aria-live="polite">
        ${shownValue !== null ? `
          <div class="die${rolling ? ' is-rolling' : ''}">${dieSVG(shownValue)}</div>
          <p class="die-zone__text">${rolling ? 'Rolling…' : `${esc(lastRoller.name)} rolled ${shownValue}!`}</p>` : ''}
      </div>

      ${done
        ? `<button type="button" class="btn" data-action="start">START THE GAME</button>`
        : rolling
          ? `<button type="button" class="btn" disabled>ROLLING…</button>`
          : `<button type="button" class="btn" data-action="roll">
               ${(rolls[next] || []).length ? 'ROLL AGAIN' : 'ROLL'} FOR ${esc(nextPlayer.name.toUpperCase())}
             </button>`}
    </section>`;
  }

  bindActions(root, {
    back() {
      state.phase = 'setup';
      state.rolls = {};
      app.save();
      app.go('players');
    },
    roll() {
      const id = nextRoller(state.players, state.rolls);
      if (id === null || rolling) return;
      const value = rollDie();
      rolling = true;
      lastRollerId = id;
      // Le résultat est enregistré tout de suite (sécurité si l'app se ferme)
      state.rolls[id] = [...(state.rolls[id] || []), value];
      app.save();

      // Animation : le dé change de face plusieurs fois avant de s'arrêter
      const started = Date.now();
      timer = setInterval(() => {
        if (Date.now() - started >= ROLL_ANIMATION_MS) {
          clearInterval(timer);
          rolling = false;
          shownValue = value;
          draw();
          return;
        }
        shownValue = 1 + Math.floor(Math.random() * 6);
        draw();
      }, 90);
    },
    start() {
      const ordered = orderFromRolls(state.players, state.rolls);
      state.turnOrder = ordered.map((p) => p.id);
      // Le 1er lancer = nombre de cases parcourues depuis START
      state.players.forEach((p) => {
        p.position = state.rolls[p.id][0];
        p.skipTurns = 0;
      });
      state.current = 0;
      state.round = 1;
      state.winnerId = null;
      state.phase = 'playing';
      app.save();
      app.go('turn');
    }
  });

  draw();

  // Nettoyage si on quitte l'écran pendant l'animation
  return () => clearInterval(timer);
}
