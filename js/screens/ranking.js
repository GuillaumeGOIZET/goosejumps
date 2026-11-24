/* =========================================================
   Classement (maquette Ranking) : podium + liste
   Accessible à tout moment pendant la partie.
   ========================================================= */

import { gooseSVG } from '../goose.js';
import { FINISH, ranking } from '../game.js';
import { esc, backButton, bindActions } from '../ui.js';

const MEDALS = ['#FFD23F', '#FFF6E5', '#FF8A1F'];  // 1er, 2e, 3e
const HEIGHTS = [130, 96, 70];

/** Podium des 3 premiers (ordre à l'écran : 2e, 1er, 3e) */
export function podium(list) {
  const top = list.slice(0, 3);
  const onScreen = [1, 0, 2].filter((i) => top[i]);
  return `
  <div class="podium">
    ${onScreen.map((i) => `
      <div class="podium__step">
        ${gooseSVG({ color: top[i].color, hat: top[i].hat, size: 64 })}
        <span class="podium__name">${esc(top[i].name)}</span>
        <div class="podium__block" style="height:${HEIGHTS[i]}px;background:${MEDALS[i]}">
          <span>${i + 1}</span>
        </div>
      </div>`).join('')}
  </div>`;
}

/** Liste de tous les joueurs avec cases restantes */
export function rankingList(state, list) {
  return `
  <ol class="rank-list">
    ${list.map((p, i) => {
      const left = Math.max(0, FINISH - p.position);
      const percent = Math.round((Math.min(p.position, FINISH) / FINISH) * 100);
      return `
      <li class="rank-row">
        <div class="rank-row__line">
          <span class="rank-row__rank">${i + 1}.</span>
          <span class="rank-row__name">${esc(p.name)}</span>
          <span class="rank-row__left">${p.id === state.winnerId || left === 0 ? 'Finished!' : `${left} to go`}</span>
          <span class="rank-row__space" aria-label="Space ${p.position}">${p.position}</span>
        </div>
        <div class="rank-row__bar" aria-hidden="true">
          <div style="width:${percent}%;background:${p.color}"></div>
        </div>
      </li>`;
    }).join('')}
  </ol>`;
}

export function render(root, app, params) {
  const state = app.state;
  const list = ranking(state);

  root.innerHTML = `
  <section class="screen ranking">
    <div class="topbar">
      ${backButton('back', 'Back to the game')}
      <h1>Leaderboard</h1>
    </div>
    ${podium(list)}
    ${rankingList(state, list)}
    <p class="hint hint--center">Ranked by space on the board · FINISH is space ${FINISH}</p>
  </section>`;

  bindActions(root, {
    back() {
      app.go(params.from || 'turn', params.backParams || {});
    }
  });
}
