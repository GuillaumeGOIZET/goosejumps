/* =========================================================
   Cartes Chance / Special (maquette Event)
   On tire une carte, puis on applique son effet (champ `effect` de cards.json).

   Effets gérés (champ effect.type) :
   - move          : avancer / reculer de `value` cases (404 Error!)
   - moveWith      : le joueur ET un joueur choisi avancent de `value` (Good Connection!)
   - jumpTo        : aller à la prochaine case de type `space` (Lucky Jump!)
   - status        : effet gardé pour plus tard, `status` = luckyBreak, goldenShield,
                     help ou double (voir EFFECTS dans game.js)
   - brainSwap     : un joueur choisi répond à la question à ta place (Brain Swap!)
   - freeze        : un joueur choisi passe son prochain tour (Freeze!)
   - moveOthers    : tous les autres joueurs bougent de `value` cases
   - swap          : échanger sa place avec un joueur au choix
   - skipTurn      : passer son prochain tour
   - judged        : les autres jugent un petit défi (right / wrong cases)
   - bonusQuestion : question bonus (level, right, wrong) → écran question
   - manual        : les joueurs appliquent la carte eux-mêmes

   params.type : 'chance' ou 'special'
   ========================================================= */

import {
  SPACE_TYPES, SHOW_EXAMPLE_CARD_NOTICE, EFFECTS, BONUS_MOVE, SPECIAL_BACK_CHANCE,
  currentPlayer, otherPlayers, getPlayer, drawCard, movePlayer, setPosition, nextTurn,
  setEffect, skipNextTurn, nextSpaceOfType
} from '../game.js';
import { esc, backButton, bindActions, moveSentence, fromTo, spaceName, spaceMark, spaces } from '../ui.js';
import { sfx } from '../sound.js';
import { t } from '../i18n.js';

export function render(root, app, params) {
  const state = app.state;
  const player = currentPlayer(state);
  const name = esc(player.name);

  let deck = params.type === 'special' ? 'special' : 'chance';
  let card = null;        // carte tirée
  let outcome = null;     // lignes de résultat une fois l'effet appliqué
  let justDrawn = false;  // pour n'animer la carte qu'une seule fois
  let bonusMove = 0;      // cases en plus (> 0 : avance, < 0 : recule) pour une carte qui ne fait pas bouger le joueur

  // Effets qui ne font jamais bouger le joueur qui tire la carte
  // (move, moveWith, swap… le font déjà avancer ou reculer : pas de bonus)
  const NO_MOVE_EFFECTS = ['status', 'manual', 'freeze', 'brainSwap', 'skipTurn', 'moveOthers'];

  // La carte laisse-t-elle le joueur sur place ? (sinon il resterait bloqué sur la case)
  function needsBonusMove() {
    const effect = card.effect || { type: 'manual' };
    if (NO_MOVE_EFFECTS.includes(effect.type)) return true;
    if (effect.type === 'jumpTo') return nextSpaceOfType(player.position, effect.space) === null;
    return false;
  }

  // Applique le bonus de cases (s'il y en a un) et renvoie la ligne de résultat
  function applyBonusMove() {
    if (!bonusMove) return [];
    const { from, to, saved } = movePlayer(state, player.id, bonusMove); // Lucky Break peut annuler un recul
    if (bonusMove > 0) sfx.moveUp();
    else sfx.moveDown();
    if (saved) return [moveLines(player, from, to, saved)]; // « Lucky Break! … ignores the penalty »
    return [`${bonusMove > 0 ? t('Bonus!', 'Bonus !') : t('Ouch!', 'Aïe !')} ${moveLines(player, from, to)}`];
  }

  // « + 2 SPACES » ajouté aux boutons
  const bonusLabel = () => (bonusMove > 0 ? ` · +${bonusMove}` : bonusMove < 0 ? ` · −${-bonusMove}` : '');

  // Liste des autres joueurs à choisir (data-action = action déclenchée)
  function pickList(question, action) {
    return `
    <p class="hint hint--center">${question}</p>
    <div class="pick-list">
      ${otherPlayers(state, player.id).map((p) => `
        <button type="button" class="pick-btn" data-action="${action}" data-id="${p.id}">
          <span class="pick-btn__name">${esc(p.name)}</span>
          <span class="pick-btn__meta">${p.position <= 0 ? 'START' : `${t('Space', 'Case')} ${p.position}`}</span>
        </button>`).join('')}
    </div>`;
  }

  // ---------- Boutons d'action selon l'effet de la carte ----------
  function actionsHTML() {
    const effect = card.effect || { type: 'manual' };

    switch (effect.type) {
      case 'moveWith':
        return pickList(t(`${name}, who moves forward ${effect.value} spaces with you?`, `${name}, qui avance de ${effect.value} cases avec toi ?`), 'applyMoveWith');
      case 'jumpTo': {
        const target = nextSpaceOfType(player.position, effect.space);
        return target === null
          ? `<p class="hint hint--center">${t(`No ${SPACE_TYPES[effect.space].label} space ahead.`, `Plus de case ${SPACE_TYPES[effect.space].label} devant toi.`)}</p>
             <button type="button" class="btn btn--sm" data-action="applyJump">${t('MOVE FORWARD', 'AVANCER DE')} ${bonusMove}</button>`
          : `<button type="button" class="btn btn--sm" data-action="applyJump">${t('JUMP TO SPACE', 'SAUTER À LA CASE')} ${target}</button>`;
      }
      case 'status':
        return `<button type="button" class="btn btn--sm" data-action="applyStatus">${t('KEEP THIS CARD', 'GARDER LA CARTE')}${bonusLabel()}</button>`;
      case 'brainSwap':
        return pickList(t(`${name}, who answers your question?`, `${name}, qui répond à ta question ?`), 'applyBrainSwap');
      case 'freeze':
        return pickList(t(`${name}, who skips their next turn?`, `${name}, qui passe son prochain tour ?`), 'applyFreeze');
      case 'move': {
        const label = effect.value >= 0 ? t(`MOVE FORWARD ${effect.value}`, `AVANCER DE ${effect.value}`) : t(`MOVE BACK ${-effect.value}`, `RECULER DE ${-effect.value}`);
        return `<button type="button" class="btn btn--sm" data-action="applyMove">${label}</button>`;
      }
      case 'moveOthers': {
        const label = effect.value >= 0 ? t(`EVERYONE ELSE: +${effect.value}`, `TOUS LES AUTRES : +${effect.value}`) : t(`EVERYONE ELSE: −${-effect.value}`, `TOUS LES AUTRES : −${-effect.value}`);
        return `<button type="button" class="btn btn--sm" data-action="applyMoveOthers">${label}${bonusLabel()}</button>`;
      }
      case 'swap':
        return `
        <p class="hint hint--center">${name}, who do you swap with?</p>
        <div class="pick-list">
          ${otherPlayers(state, player.id).map((p) => `
            <button type="button" class="pick-btn" data-action="applySwap" data-id="${p.id}">
              <span class="pick-btn__name">${esc(p.name)}</span>
              <span class="pick-btn__meta">${p.position <= 0 ? 'START' : `${t('Space', 'Case')} ${p.position}`}</span>
            </button>`).join('')}
        </div>`;
      case 'skipTurn':
        return `<button type="button" class="btn btn--sm" data-action="applySkip">${t('GOT IT', 'COMPRIS')}${bonusLabel()}</button>`;
      case 'judged':
        return `
        <p class="hint hint--center">${t(`Other players: did ${name} succeed?`, `Les autres joueurs : ${name} a réussi ?`)}</p>
        <div class="two-buttons">
          <button type="button" class="btn btn--correct btn--sm" data-action="applyJudged" data-value="right">${t('SUCCESS', 'RÉUSSI')}</button>
          <button type="button" class="btn btn--wrong btn--sm" data-action="applyJudged" data-value="wrong">${t('FAILED', 'RATÉ')}</button>
        </div>`;
      case 'bonusQuestion':
        return `<button type="button" class="btn btn--sm" data-action="bonus">${t('PLAY THE BONUS QUESTION', 'JOUER LA QUESTION BONUS')}</button>`;
      default: // manual
        return `
        <p class="hint hint--center">${t('Apply this card yourselves on the board.', 'Appliquez cette carte vous-mêmes sur le plateau.')}</p>
        <button type="button" class="btn btn--sm" data-action="finish">${t('DONE', 'TERMINÉ')}${bonusLabel() || t(' · NEXT PLAYER', ' · JOUEUR SUIVANT')}</button>`;
    }
  }

  // ---------- Écran ----------
  function draw() {
    const info = SPACE_TYPES[deck];
    const kind = info.label.toUpperCase();
    const mark = spaceMark(deck);
    const colors = `--c: ${info.color}; --bd: ${info.border}${info.text ? `; --mark: ${info.text}` : ''}`;
    const canSwitch = card === null;

    let cardHTML;
    if (!card) {
      cardHTML = `
      <button type="button" class="event-card event-card--back" style="${colors}" data-action="draw">
        <span class="event-card__mark">${mark}</span>
        <span class="event-card__cta">${t('TAP TO DRAW', 'TOUCHE POUR TIRER')}</span>
      </button>`;
    } else {
      cardHTML = `
      <div class="event-card event-card--front${justDrawn ? ' is-new' : ''}" style="${colors}">
        <div class="card__head">
          <span class="tag">${kind}</span>
          <span class="event-card__small-mark" aria-hidden="true">${mark}</span>
        </div>
        <h2 class="event-card__title">${esc(card.title)}</h2>
        <p class="event-card__text">${esc(t(card.text, card.textFr || card.text))}</p>
        ${bonusMove > 0 ? `<p class="event-card__bonus">${t(`+ Move forward ${spaces(bonusMove)}!`, `+ Avance de ${spaces(bonusMove)} !`)}</p>` : ''}
        ${bonusMove < 0 ? `<p class="event-card__bonus event-card__bonus--back">${t(`− Move back ${spaces(bonusMove)}!`, `− Recule de ${spaces(bonusMove)} !`)}</p>` : ''}
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
        ? `<button type="button" class="btn btn--sm" data-action="next">${t('NEXT PLAYER', 'JOUEUR SUIVANT')} : ${esc(next.name.toUpperCase())}</button>`
        : `<button type="button" class="btn btn--sm" data-action="winner">${t('SEE THE WINNER', 'VOIR LE GAGNANT')}</button>`}`;
    }

    root.innerHTML = `
    <section class="screen event">
      <div class="topbar topbar--between">
        ${canSwitch ? backButton('back', 'Back to turn') : '<span></span>'}
        ${canSwitch ? `
        <div class="tabs" role="group" aria-label="${t('Deck', 'Paquet')}">
          <button type="button" class="tab${deck === 'chance' ? ' is-selected' : ''}" data-action="deck" data-value="chance" aria-pressed="${deck === 'chance'}">Chance</button>
          <button type="button" class="tab${deck === 'special' ? ' is-selected' : ''}" data-action="deck" data-value="special" aria-pressed="${deck === 'special'}">Special</button>
        </div>` : ''}
      </div>
      <h1>${t(`${name} landed on ${info.label}`, `${name} arrive sur ${info.label}`)}</h1>
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
  // (saved = Lucky Break a annulé le recul)
  function moveLines(p, from, to, saved = false) {
    if (saved) return t(`Lucky Break! ${esc(p.name)} ignores the penalty. <span class="outcome__space">Still on ${spaceName(from)}</span>`, `Lucky Break ! ${esc(p.name)} évite la pénalité. <span class="outcome__space">Toujours sur ${spaceName(from)}</span>`);
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
      // Carte qui ne fait pas bouger : 1 à 3 cases en plus (en arrière 1 fois sur 2 pour une Special)
      const { min, max } = BONUS_MOVE;
      bonusMove = needsBonusMove() ? min + Math.floor(Math.random() * (max - min + 1)) : 0;
      if (deck === 'special' && Math.random() < SPECIAL_BACK_CHANCE) bonusMove = -bonusMove;
      app.save(); // la carte est marquée comme tirée
      draw();
      sfx.cardFlip();
    },
    applyMove() {
      const { from, to, saved } = movePlayer(state, player.id, card.effect.value);
      if (to >= from) sfx.moveUp();
      else sfx.moveDown();
      finishWith([moveLines(player, from, to, saved)]);
    },
    applyMoveWith({ id }) {
      const friend = getPlayer(state, Number(id));
      const mine = movePlayer(state, player.id, card.effect.value);
      const theirs = movePlayer(state, friend.id, card.effect.value);
      sfx.moveUp();
      finishWith([moveLines(player, mine.from, mine.to), moveLines(friend, theirs.from, theirs.to)]);
    },
    applyJump() {
      const target = nextSpaceOfType(player.position, card.effect.space);
      if (target === null) {
        finishWith(applyBonusMove()); // pas de case Chance devant : le bonus fait avancer
        return;
      }
      const { from, to } = setPosition(state, player.id, target);
      sfx.moveUp();
      finishWith([moveLines(player, from, to)]);
    },
    applyStatus() {
      const status = card.effect.status;
      setEffect(player, status, true);
      sfx.reveal();
      finishWith([t(`${name} keeps <strong>${EFFECTS[status].label}</strong>. ${EFFECTS[status].text}`, `${name} garde <strong>${EFFECTS[status].label}</strong>. ${EFFECTS[status].textFr}`), ...applyBonusMove()]);
    },
    applyBrainSwap({ id }) {
      // La carte est déjà marquée comme tirée : on passe à la question,
      // le tour se termine après le jugement. Le bonus de cases du joueur
      // est appliqué tout de suite et rappelé sur l'écran de résultat.
      const notes = applyBonusMove();
      app.save();
      sfx.swap();
      app.go('question', { answererId: Number(id), notes });
    },
    applyFreeze({ id }) {
      const target = getPlayer(state, Number(id));
      if (skipNextTurn(state, target.id)) {
        sfx.freeze();
        finishWith([t(`${esc(target.name)} is frozen and will skip their next turn!`, `${esc(target.name)} passera son prochain tour à cause du gel !`), ...applyBonusMove()]);
      } else {
        sfx.reveal();
        finishWith([t(`Lucky Break! ${esc(target.name)} ignores the freeze.`, `Lucky Break ! ${esc(target.name)} évite le gel.`), ...applyBonusMove()]);
      }
    },
    applyMoveOthers() {
      const lines = otherPlayers(state, player.id).map((p) => {
        const { from, to } = movePlayer(state, p.id, card.effect.value);
        return moveLines(p, from, to);
      });
      if (card.effect.value >= 0) sfx.moveUp();
      else sfx.moveDown();
      finishWith([...lines, ...applyBonusMove()]);
    },
    applySwap({ id }) {
      const other = otherPlayers(state, player.id).find((p) => p.id === Number(id));
      const mine = player.position;
      const theirs = other.position;
      setPosition(state, player.id, theirs);
      setPosition(state, other.id, mine);
      sfx.swap();
      finishWith([
        t(`${name} and ${esc(other.name)} swap places!`, `${name} et ${esc(other.name)} échangent leurs places !`),
        `<span class="outcome__space">${name}: ${spaceName(mine)} → ${spaceName(theirs)}</span>`,
        `<span class="outcome__space">${esc(other.name)}: ${spaceName(theirs)} → ${spaceName(mine)}</span>`
      ]);
    },
    applySkip() {
      player.skipTurns += 1;
      sfx.snore();
      finishWith([`${name} will skip their next turn.`, ...applyBonusMove()]);
    },
    applyJudged({ value }) {
      const delta = value === 'right' ? card.effect.right : -(card.effect.wrong || 0);
      const { from, to } = movePlayer(state, player.id, delta);
      if (value === 'right') sfx.correct();
      else sfx.wrong();
      finishWith([`${value === 'right' ? t('Well done!', 'Bravo !') : t('Not this time.', 'Pas cette fois.')} ${moveLines(player, from, to)}`]);
    },
    bonus() {
      const e = card.effect;
      app.go('question', { bonus: { level: e.level || 'hard', right: e.right, wrong: e.wrong || 0 } });
    },
    finish() {
      if (bonusMove) {
        finishWith(applyBonusMove());
        return;
      }
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
