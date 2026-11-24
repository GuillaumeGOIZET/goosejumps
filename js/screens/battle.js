/* =========================================================
   Battle (maquette Battle)
   Étapes : adversaire → thème → question éclair (sans timer)
            → qui a gagné ? → résultat
   Le gagnant avance d'1 case, l'autre reste sur place.
   ========================================================= */

import { gooseSVG } from '../goose.js';
import {
  CATEGORIES, SPACE_TYPES, BATTLE_WIN_MOVE,
  currentPlayer, otherPlayers, getPlayer, drawBattleQuestion, movePlayer, nextTurn
} from '../game.js';
import { esc, backButton, bindActions, moveSentence, spaceName } from '../ui.js';
import { sfx } from '../sound.js';

const STEPS = { opponent: '1/3', theme: '2/3', question: '3/3', winner: '3/3', result: '' };

export function render(root, app) {
  const state = app.state;
  const me = currentPlayer(state);

  let phase = 'opponent';
  let opponent = null;
  let theme = null;
  let question = null;
  let result = null; // { winner, loser } ou { winner: null }

  function fighter(player, look) {
    if (!player) {
      return `
      <div class="fighter">
        <div class="fighter__ring fighter__ring--empty"><span>?</span></div>
        <span class="fighter__name">Rival</span>
      </div>`;
    }
    return `
    <div class="fighter">
      <div class="fighter__ring${player === me ? ' fighter__ring--me' : ''}">
        ${gooseSVG({ color: player.color, hat: player.hat, size: 70, look })}
      </div>
      <span class="fighter__name">${esc(player.name)}</span>
    </div>`;
  }

  function bodyHTML() {
    if (phase === 'opponent') {
      return `
      <h1 class="battle__title">${esc(me.name)}, who do you challenge?</h1>
      <div class="pick-list">
        ${otherPlayers(state, me.id).map((p) => `
          <button type="button" class="pick-btn pick-btn--battle" data-action="opponent" data-id="${p.id}">
            <span class="pick-btn__name">${esc(p.name)}</span>
            <span class="pick-btn__meta">Space ${p.position}</span>
          </button>`).join('')}
      </div>`;
    }

    if (phase === 'theme') {
      return `
      <h1 class="battle__title">Pick the battle theme</h1>
      <div class="theme-grid">
        ${CATEGORIES.map((c) => `
          <button type="button" class="theme-btn" style="--c: ${SPACE_TYPES[c].color}" data-action="theme" data-value="${c}">
            ${SPACE_TYPES[c].label}
          </button>`).join('')}
      </div>`;
    }

    if (phase === 'question' || phase === 'winner') {
      const info = SPACE_TYPES[theme];
      return `
      <div class="card battle-card">
        <div class="card__head">
          <span class="tag" style="--tag-color: ${info.color}">${info.label.toUpperCase()}</span>
          <span class="battle-card__kind">SPEED QUESTION</span>
        </div>
        <h1 class="battle-card__question">${esc(question.question)}</h1>
        ${phase === 'winner' ? `
          <div class="answer">
            <span class="label">Answer</span>
            <span class="answer__text">${esc(question.answer)}</span>
          </div>` : ''}
      </div>`;
    }

    // Résultat
    if (result.winner) {
      return `
      <div class="battle-result">
        <h1 class="battle-result__title">${esc(result.winner.name)} wins the battle!</h1>
        <span class="battle-result__move">${moveSentence(esc(result.winner.name), result.from, result.to)}</span>
        <span class="battle-result__stay">${esc(result.loser.name)} stays on ${spaceName(result.loser.position)}.</span>
      </div>`;
    }
    return `
    <div class="battle-result">
      <h1 class="battle-result__title">No winner this time</h1>
      <span class="battle-result__move">Nobody moves.</span>
      <span class="battle-result__stay">${esc(me.name)} and ${esc(opponent.name)} stay where they are.</span>
    </div>`;
  }

  function footerHTML() {
    if (phase === 'question') {
      return `
      <div class="footer-stack">
        <p class="hint hint--center">First to shout the right answer in English wins!</p>
        <button type="button" class="btn btn--cream btn--battle btn--sm" data-action="reveal">SHOW ANSWER</button>
      </div>`;
    }
    if (phase === 'winner') {
      return `
      <div class="footer-stack">
        <p class="hint hint--center">Who gave the right answer first?</p>
        <div class="two-buttons">
          <button type="button" class="winner-btn" data-action="win" data-id="${me.id}">${esc(me.name)}</button>
          <button type="button" class="winner-btn" data-action="win" data-id="${opponent.id}">${esc(opponent.name)}</button>
        </div>
        <button type="button" class="dashed-btn" data-action="win" data-id="">Nobody got it</button>
      </div>`;
    }
    if (phase === 'result') {
      const next = state.phase === 'finished' ? null : currentPlayer(state);
      return next
        ? `<button type="button" class="btn btn--cream btn--battle btn--sm" data-action="next">NEXT PLAYER: ${esc(next.name.toUpperCase())}</button>`
        : `<button type="button" class="btn btn--cream btn--battle btn--sm" data-action="victory">SEE THE WINNER</button>`;
    }
    return '';
  }

  function draw() {
    root.innerHTML = `
    <section class="screen battle">
      <div class="deco" style="left:-80px;top:240px;width:260px;height:260px"></div>
      <div class="deco" style="right:-90px;top:380px;width:240px;height:240px"></div>

      <div class="topbar topbar--between">
        ${phase === 'opponent' ? backButton('back', 'Back to turn', 'icon-btn--battle') : '<span class="topbar__placeholder"></span>'}
        <span class="battle__logo">BATTLE!</span>
        <span class="topbar__step battle__step">${STEPS[phase]}</span>
      </div>

      <div class="versus">
        ${fighter(me, 'right')}
        <span class="versus__vs" aria-label="versus">VS</span>
        ${fighter(opponent, 'left')}
      </div>

      ${bodyHTML()}
      <div class="spacer"></div>
      ${footerHTML()}
    </section>`;
  }

  bindActions(root, {
    back() {
      app.go('turn');
    },
    opponent({ id }) {
      opponent = getPlayer(state, Number(id));
      phase = 'theme';
      draw();
    },
    theme({ value }) {
      theme = value;
      question = drawBattleQuestion(state, theme);
      app.save();
      phase = 'question';
      draw();
      sfx.start();
    },
    reveal() {
      phase = 'winner';
      draw();
      sfx.reveal();
    },
    win({ id }) {
      if (id) {
        const winner = getPlayer(state, Number(id));
        const loser = winner === me ? opponent : me;
        const { from, to } = movePlayer(state, winner.id, BATTLE_WIN_MOVE);
        result = { winner, loser, from, to };
        sfx.battleWin();
      } else {
        result = { winner: null };
        sfx.nobody();
      }
      if (state.phase !== 'finished') nextTurn(state);
      app.save();
      phase = 'result';
      draw();
    },
    next() {
      app.go('turn');
    },
    victory() {
      app.go('victory');
    }
  });

  draw();
  sfx.battle(); // roulement de tambour à l'arrivée sur l'écran
}
