/* =========================================================
   Cartes Chance / Special (maquette Event)
   On tire une carte, puis on applique son effet (champ `effect` de cards.json).

   Effets gérés :
   - move          : avancer / reculer de `value` cases
   - moveOthers    : tous les autres joueurs bougent de `value` cases
   - swap          : échanger sa place avec un joueur au choix
   - skipTurn      : passer son prochain tour
   - judged        : les autres jugent un petit défi (right / wrong cases)
   - bonusQuestion : question bonus (level, right, wrong) → écran question
   - manual        : les joueurs appliquent la carte eux-mêmes

   params.type : 'chance' ou 'special'
   ========================================================= */

import {
  SPACE_TYPES, SHOW_EXAMPLE_CARD_NOTICE,
  currentPlayer, otherPlayers, drawCard, movePlayer, setPosition, nextTurn
} from '../game.js';
import { esc, backButton, bindActions, moveSentence, fromTo, spaceName, spaceMark } from '../ui.js';
import { sfx } from '../sound.js';

export function render(root, app, params) {
  const state = app.state;
  const player = currentPlayer(state);
  const name = esc(player.name);

  let deck = params.type === 'special' ? 'special' : 'chance';
  let card = null;        // carte tirée
  let outcome = null;     // lignes de résultat une fois l'effet appliqué
  let justDrawn = false;  // pour n'animer la carte qu'une seule fois

  // ---------- Boutons d'action selon l'effet de la carte ----------
  function actionsHTML() {
    const effect = card.effect || { type: 'manual' };

    switch (effect.type) {
      case 'move': {
        const label = effect.value >= 0 ? `MOVE FORWARD ${effect.value}` : `MOVE BACK ${-effect.value}`;
        return `<button type="button" class="btn btn--sm" data-action="applyMove">${label}</button>`;
      }
      case 'moveOthers': {
        const label = effect.value >= 0 ? `EVERYONE ELSE: +${effect.value}` : `EVERYONE ELSE: −${-effect.value}`;
        return `<button type="button" class="btn btn--sm" data-action="applyMoveOthers">${label}</button>`;
      }
      case 'swap':
        return `
        <p class="hint hint--center">${name}, who do you swap with?</p>
        <div class="pick-list">
          ${otherPlayers(state, player.id).map((p) => `
            <button type="button" class="pick-btn" data-action="applySwap" data-id="${p.id}">
              <span class="pick-btn__name">${esc(p.name)}</span>
              <span class="pick-btn__meta">Space ${p.position}</span>
            </button>`).join('')}
        </div>`;
      case 'skipTurn':
        return `<button type="button" class="btn btn--sm" data-action="applySkip">GOT IT</button>`;
      case 'judged':
        return `
        <p class="hint hint--center">Other players: did ${name} succeed?</p>
        <div class="two-buttons">
          <button type="button" class="btn btn--blue btn--sm" data-action="applyJudged" data-value="right">SUCCESS</button>
          <button type="button" class="btn btn--sm" data-action="applyJudged" data-value="wrong">FAILED</button>
        </div>`;
      case 'bonusQuestion':
        return `<button type="button" class="btn btn--sm" data-action="bonus">PLAY THE BONUS QUESTION</button>`;
      default: // manual
        return `
        <p class="hint hint--center">Apply this card yourselves on the board.</p>
        <button type="button" class="btn btn--sm" data-action="finish">DONE · NEXT PLAYER</button>`;
    }
  }

  // ---------- Écran ----------
  function draw() {
    const info = SPACE_TYPES[deck];
    const kind = info.label.toUpperCase();
    const mark = spaceMark(deck);
    const colors = `--c: ${info.color}; --bd: ${info.border}`;
    const canSwitch = card === null;

    let cardHTML;
    if (!card) {
      cardHTML = `
      <button type="button" class="event-card event-card--back" style="${colors}" data-action="draw">
        <span class="event-card__mark">${mark}</span>
        <span class="event-card__cta">TAP TO DRAW</span>
      </button>`;
    } else {
      cardHTML = `
      <div class="event-card event-card--front${justDrawn ? ' is-new' : ''}" style="${colors}">
        <div class="card__head">
          <span class="tag">${kind}</span>
          <span class="event-card__small-mark" aria-hidden="true">${mark}</span>
        </div>
        <h2 class="event-card__title">${esc(card.title)}</h2>
        <p class="event-card__text">${esc(card.text)}</p>
        <div class="spacer"></div>
        ${SHOW_EXAMPLE_CARD_NOTICE ? '<span class="event-card__notice">EXAMPLE CARD · REAL CARDS TO COME</span>' : ''}
      </div>`;
    }

    let footer = '';
    if (card && !outcome) {
      footer = `<div class="footer-stack">${actionsHTML()}</div>`;
    } else if (outcome) {
      const next = state.phase === 'finished' ? null : currentPlayer(state);
      footer = `
      <div class="outcome">
        ${outcome.map((line) => `<p>${line}</p>`).join('')}
      </div>
      ${next
        ? `<button type="button" class="btn btn--sm" data-action="next">NEXT PLAYER: ${esc(next.name.toUpperCase())}</button>`
        : `<button type="button" class="btn btn--sm" data-action="winner">SEE THE WINNER</button>`}`;
    }

    root.innerHTML = `
    <section class="screen event">
      <div class="topbar topbar--between">
        ${canSwitch ? backButton('back', 'Back to turn') : '<span></span>'}
        ${canSwitch ? `
        <div class="tabs" role="group" aria-label="Deck">
          <button type="button" class="tab${deck === 'chance' ? ' is-selected' : ''}" data-action="deck" data-value="chance" aria-pressed="${deck === 'chance'}">Chance</button>
          <button type="button" class="tab${deck === 'special' ? ' is-selected' : ''}" data-action="deck" data-value="special" aria-pressed="${deck === 'special'}">Special</button>
        </div>` : ''}
      </div>
      <h1>${name} landed on ${info.label}</h1>
      ${cardHTML}
      <div class="spacer"></div>
      ${footer}
    </section>`;
    justDrawn = false;
  }

  // Termine le tour : joueur suivant + sauvegarde, puis affiche le résultat
  function finishWith(lines) {
    if (state.phase !== 'finished') nextTurn(state);
    app.save();
    outcome = lines;
    draw();
  }

  // Phrase + "Space 7 → space 9" pour un déplacement
  function moveLines(p, from, to) {
    return `${moveSentence(esc(p.name), from, to)} <span class="outcome__space">${fromTo(from, to)}</span>`;
  }

  bindActions(root, {
    back() {
      app.go('turn');
    },
    deck({ value }) {
      deck = value;
      draw();
    },
    draw() {
      card = drawCard(state, deck);
      justDrawn = true;
      app.save(); // la carte est marquée comme tirée
      draw();
      sfx.cardFlip();
    },
    applyMove() {
      const { from, to } = movePlayer(state, player.id, card.effect.value);
      if (to >= from) sfx.moveUp();
      else sfx.moveDown();
      finishWith([moveLines(player, from, to)]);
    },
    applyMoveOthers() {
      const lines = otherPlayers(state, player.id).map((p) => {
        const { from, to } = movePlayer(state, p.id, card.effect.value);
        return moveLines(p, from, to);
      });
      if (card.effect.value >= 0) sfx.moveUp();
      else sfx.moveDown();
      finishWith(lines);
    },
    applySwap({ id }) {
      const other = otherPlayers(state, player.id).find((p) => p.id === Number(id));
      const mine = player.position;
      const theirs = other.position;
      setPosition(state, player.id, theirs);
      setPosition(state, other.id, mine);
      sfx.swap();
      finishWith([
        `${name} and ${esc(other.name)} swap places!`,
        `<span class="outcome__space">${name}: ${spaceName(mine)} → ${spaceName(theirs)}</span>`,
        `<span class="outcome__space">${esc(other.name)}: ${spaceName(theirs)} → ${spaceName(mine)}</span>`
      ]);
    },
    applySkip() {
      player.skipTurns += 1;
      sfx.snore();
      finishWith([`${name} will skip their next turn.`]);
    },
    applyJudged({ value }) {
      const delta = value === 'right' ? card.effect.right : -(card.effect.wrong || 0);
      const { from, to } = movePlayer(state, player.id, delta);
      if (value === 'right') sfx.correct();
      else sfx.wrong();
      finishWith([`${value === 'right' ? 'Well done!' : 'Not this time.'} ${moveLines(player, from, to)}`]);
    },
    bonus() {
      const e = card.effect;
      app.go('question', { bonus: { level: e.level || 'hard', right: e.right, wrong: e.wrong || 0 } });
    },
    finish() {
      if (state.phase !== 'finished') nextTurn(state);
      app.save();
      app.go('turn');
    },
    next() {
      app.go('turn');
    },
    winner() {
      app.go('victory');
    }
  });

  draw();
}
