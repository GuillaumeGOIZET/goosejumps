/* =========================================================
   Écran du tour (maquette Turn)
   « It's [name]'s turn! », barre de progression, choix du type de case.
   Le type de la case est pré-sélectionné grâce à board.json.
   ========================================================= */

import { avatar, gooseImg } from '../goose.js';
import { FINISH, SPACE_TYPES, EFFECTS, activeEffects, currentPlayer, nextTurn, spaceTypeAt } from '../game.js';
import { esc, bindActions, ICONS, spaceMark } from '../ui.js';
import { sfx, soundButton } from '../sound.js';

// Pour ne jouer le « ding-dong » qu'au début d'un nouveau tour
// (et pas en revenant du classement ou des règles)
let lastTurnKey = '';

// Ordre des boutons de type de case (Battle prend toute la largeur)
const TYPE_BUTTONS = ['web', 'cyber', 'design', 'marketing', 'chance', 'special', 'battle'];

/** Barre de progression avec les oies (réutilisée sur d'autres écrans) */
export function raceTrack(state, activeId) {
  const racers = state.turnOrder.map((id, i) => {
    const p = state.players.find((pl) => pl.id === id);
    const percent = (Math.min(p.position, FINISH) / FINISH).toFixed(4);
    const active = id === activeId;
    return `
    <div class="racer${active ? ' racer--active' : ''}"
         style="left: calc((100% - 40px) * ${percent}); top: ${i % 2 === 0 ? 0 : 18}px">
      ${avatar(p, 40, { active })}
      <span class="racer__space">${p.position}</span>
    </div>`;
  }).join('');

  return `
  <div class="race panel" role="img" aria-label="Race to the finish: ${state.turnOrder
    .map((id) => {
      const p = state.players.find((pl) => pl.id === id);
      return `${esc(p.name)} on space ${p.position}`;
    }).join(', ')}">
    <div class="race__labels" aria-hidden="true">
      <span>START</span><span>RACE TO THE FINISH</span><span>FINISH</span>
    </div>
    <div class="race__track" aria-hidden="true">
      <div class="race__line"></div>
      <div class="race__flag"></div>
      ${racers}
    </div>
  </div>`;
}

export function render(root, app) {
  const state = app.state;
  const player = currentPlayer(state);
  const suggested = spaceTypeAt(player.position);
  const napping = player.skipTurns > 0;

  const typeButtons = TYPE_BUTTONS.map((type) => {
    const info = SPACE_TYPES[type];
    const selected = type === suggested;
    const mark = spaceMark(type);
    const text = type === 'battle' ? 'VS · Battle' : (mark ? `${mark} ${info.label}` : info.label);
    const border = info.border ? `; --bd: ${info.border}` : '';
    return `
    <button type="button" class="type-btn${type === 'battle' ? ' type-btn--battle' : ''}${selected ? ' is-selected' : ''}"
            style="--c: ${info.color}${border}" data-action="pick" data-type="${type}"
            ${selected ? 'aria-describedby="suggestion"' : ''}>${text}</button>`;
  }).join('');

  root.innerHTML = `
  <section class="screen turn">
    <div class="topbar topbar--between">
      <button type="button" class="mini-logo" data-action="home" aria-label="Home">GOOSE JUMPS</button>
      <div class="topbar__actions">
        <button type="button" class="icon-btn icon-btn--yellow" data-action="ranking" aria-label="Leaderboard">${ICONS.leaderboard}</button>
        <button type="button" class="icon-btn" data-action="rules" aria-label="Rules">?</button>
        ${soundButton()}
      </div>
    </div>

    ${raceTrack(state, player.id)}

    <div class="turn-banner">
      <div class="turn-banner__avatar">
        ${gooseImg(player.character, 68, { head: true })}
      </div>
      <div class="turn-banner__text">
        <span class="turn-banner__meta">ROUND ${state.round} · SPACE ${player.position}</span>
        <h1 class="${player.name.length > 10 ? 'is-very-long' : player.name.length > 7 ? 'is-long' : ''}">It's ${esc(player.name)}'s turn!</h1>
        ${activeEffects(player).length ? `
          <ul class="effect-pills" aria-label="Active cards">
            ${activeEffects(player).map((e) => `<li class="effect-pill" title="${EFFECTS[e].text}">${EFFECTS[e].label}</li>`).join('')}
          </ul>` : ''}
      </div>
    </div>

    ${napping ? `
      <div class="panel nap">
        <h2>Frozen!</h2>
        <p>${esc(player.name)} is frozen and skips this turn.</p>
      </div>
      <div class="spacer"></div>
      <button type="button" class="btn" data-action="skip">NEXT PLAYER</button>
    ` : `
      <div class="types">
        <span class="label">What colour is your space?</span>
        <div class="types__grid">${typeButtons}</div>
        <p class="hint types__hint" id="suggestion">
          ${SPACE_TYPES[suggested]
            ? `Space ${player.position} should be <strong>${SPACE_TYPES[suggested].label}</strong>. Tap another colour if your goose is somewhere else.`
            : `You're on <strong>START</strong>: pick the category you want.`}
        </p>
      </div>
    `}
  </section>`;

  // Nouveau tour : ding-dong (ou ronflement si l'oie fait la sieste)
  const turnKey = JSON.stringify([state.round, state.current, state.players.map((p) => p.position)]);
  if (turnKey !== lastTurnKey) {
    lastTurnKey = turnKey;
    if (napping) sfx.freeze();
    else sfx.turn();
  }

  bindActions(root, {
    home() {
      app.go('home');
    },
    ranking() {
      app.go('ranking', { from: 'turn' });
    },
    rules() {
      app.go('rules', { from: 'turn' });
    },
    pick({ type }) {
      if (type === 'battle') app.go('battle');
      else if (type === 'chance' || type === 'special') app.go('event', { type });
      else app.go('question', { type });
    },
    skip() {
      player.skipTurns -= 1;
      nextTurn(state);
      app.save();
      app.go('turn');
    }
  });
}
