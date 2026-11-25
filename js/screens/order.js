/* =========================================================
   Écran « Roll for order » (maquette Order)
   Chaque joueur lance le dé une fois. Le plus haut commence.
   En cas d'égalité, seuls les joueurs à égalité relancent.
   Le 1er lancer = case de départ. Ensuite, plus de dé !
   ========================================================= */

import { avatar } from '../goose.js';
import { rollDie, nextRoller, isTied, orderFromRolls } from '../game.js';
import { esc, backButton, bindActions } from '../ui.js';
import { sfx } from '../sound.js';
import { t } from '../i18n.js';

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
        note = p.id === next ? t('Your turn to roll', 'À toi de lancer') : t('Waiting…', 'En attente…');
      } else if (!done && isTied(players, rolls, p.id)) {
        note = p.id === next ? t('Tie! Roll again', 'Égalité ! Relance') : t('Tie! Waiting to roll again', 'Égalité ! En attente pour relancer');
      } else {
        note = t(`Goose on space ${mine[0]}`, `Oie sur la case ${mine[0]}`);
        if (mine.length > 1) note += t(` · tie-break ${mine.slice(1).join(', ')}`, ` · départage ${mine.slice(1).join(', ')}`);
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
        <div class="order-row__roll${isRolling ? ' is-rolling' : ''}" aria-label="${t('Roll', 'Lancer')} : ${mine[0] || t('not yet', 'pas encore')}">
          ${mine.length ? (isRolling ? shownValue : mine[0]) : '–'}
        </div>
      </li>`;
    }).join('');

    const lastRoller = players.find((p) => p.id === lastRollerId);

    root.innerHTML = `
    <section class="screen order">
      <div class="topbar">
        ${backButton('back')}
        <h1>${t('Roll for order', "Lancer pour l'ordre")}</h1>
      </div>
      <ol class="order-steps">
        ${t(`
        <li>Each player <strong>rolls the die once</strong>.</li>
        <li>The <strong>highest roll plays first</strong>, then the others in order. Ties roll again.</li>
        <li>Your roll is your first move: <strong>put your goose on that space</strong> of the board (roll 4 → space 4).</li>
        <li>After this, <strong>no more dice!</strong> You move by answering questions.</li>`, `
        <li>Chaque joueur <strong>lance le dé une fois</strong>.</li>
        <li>Le <strong>plus haut score commence</strong>, puis les autres dans l’ordre. En cas d’égalité, on relance.</li>
        <li>Ton score est ta première avancée : <strong>pose ton oie sur cette case</strong> du plateau (4 → case 4).</li>
        <li>Ensuite, <strong>plus de dé !</strong> Tu avances en répondant aux questions.</li>`)}
      </ol>

      <ol class="order-list">${rows}</ol>

      <div class="spacer"></div>

      <div class="die-zone" aria-live="polite">
        ${shownValue !== null ? `
          <div class="die${rolling ? ' is-rolling' : ''}">${dieSVG(shownValue)}</div>
          <p class="die-zone__text">${rolling ? t('Rolling…', 'Lancer…') : t(`${esc(lastRoller.name)} rolled ${shownValue}!`, `${esc(lastRoller.name)} a fait ${shownValue} !`)}</p>
          ${rolling ? '' : (rolls[lastRollerId] || []).length > 1
            ? `<p class="die-zone__move">${t(`Tie-break roll: it only decides the order. ${esc(lastRoller.name)}'s goose stays on <strong>space ${rolls[lastRollerId][0]}</strong>.`, `Lancer de départage : il sert seulement à l’ordre. L’oie de ${esc(lastRoller.name)} reste sur la <strong>case ${rolls[lastRollerId][0]}</strong>.`)}</p>`
            : `<p class="die-zone__move">${t(`Put ${esc(lastRoller.name)}'s goose on <strong>space ${shownValue}</strong> of the board.`, `Pose l’oie de ${esc(lastRoller.name)} sur la <strong>case ${shownValue}</strong> du plateau.`)}</p>`}` : ''}
      </div>

      ${done
        ? `<p class="hint hint--center">${t('All set! Check that every goose is on its space, then start.', 'C’est prêt ! Vérifiez que chaque oie est sur sa case, puis commencez.')}</p>
           <button type="button" class="btn" data-action="start">${t('START THE GAME', 'COMMENCER LA PARTIE')}</button>`
        : rolling
          ? `<button type="button" class="btn" disabled>${t('ROLLING…', 'LANCER…')}</button>`
          : `<button type="button" class="btn" data-action="roll">
               ${(rolls[next] || []).length ? t('ROLL AGAIN FOR', 'RELANCER POUR') : t('ROLL FOR', 'LANCER POUR')} ${esc(nextPlayer.name.toUpperCase())}
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
          sfx.dieLand();
          return;
        }
        shownValue = 1 + Math.floor(Math.random() * 6);
        draw();
        sfx.dieTick();
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
      sfx.start();
      app.go('turn');
    }
  });

  draw();

  // Nettoyage si on quitte l'écran pendant l'animation
  return () => clearInterval(timer);
}
