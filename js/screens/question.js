/* =========================================================
   Carte question (maquette Card)
   Étapes : niveau → question + timer → réponse + jugement → résultat

   params.type       : catégorie de la case ('web', 'cyber', 'design', 'marketing')
   params.bonus      : question bonus d'une carte { level, right, wrong }
   params.answererId : carte Brain Swap, un autre joueur répond (et bouge) à ta place

   Cartes gardées par celui qui répond (voir EFFECTS dans game.js) :
   Golden Shield (pas de recul si faux), Double Trouble (×2 si juste),
   Help!! (un joueur aide, et avance de HELP_MOVE si c'est juste).
   ========================================================= */

import {
  CATEGORIES, SPACE_TYPES, MOVES, TIMER_SECONDS, HELP_MOVE,
  currentPlayer, getPlayer, otherPlayers, drawQuestion, movePlayer, nextTurn, hasEffect, setEffect
} from '../game.js';
import { esc, backButton, bindActions, ICONS, spaces, moveSentence, fromTo, spaceName } from '../ui.js';
import { sfx } from '../sound.js';

const STEPS = {
  choose: 'Step 1 of 3 · Level',
  question: 'Step 2 of 3 · Answer',
  judge: 'Step 3 of 3 · Judge',
  result: 'Result'
};

/** Texte « Right: +1 space · Wrong: −1 space » */
function movesText(right, wrong) {
  const wrongText = wrong === 0 ? 'stay where you are' : `−${spaces(wrong)}`;
  return `Right: +${spaces(right)} · Wrong: ${wrongText}`;
}

export function render(root, app, params) {
  const state = app.state;
  const player = currentPlayer(state);
  const bonus = params.bonus || null;

  // Brain Swap : un autre joueur répond (et avance ou recule) à la place du joueur dont c'est le tour
  const answerer = params.answererId ? getPlayer(state, params.answererId) : player;
  const swap = answerer !== player;
  const name = esc(answerer.name);

  // Cartes gardées par celui qui répond
  const shield = hasEffect(answerer, 'goldenShield');
  const double = hasEffect(answerer, 'double');
  const help = hasEffect(answerer, 'help');
  const helpers = otherPlayers(state, answerer.id);
  let helperId = help ? helpers[0].id : null;

  // État local de l'écran (pas besoin de le sauvegarder)
  let phase = 'choose';
  let category = CATEGORIES.includes(params.type) ? params.type : 'web';
  let level = bonus ? bonus.level : 'easy';
  let question = null;
  let deadline = 0;           // heure de fin du chrono (ms)
  let timeLeft = TIMER_SECONDS;
  let ticker = null;
  let result = null;          // { right, from, to }

  // Points gagnés / perdus pour le niveau choisi
  function points(lvl) {
    if (bonus) return { right: bonus.right, wrong: bonus.wrong };
    return { right: MOVES[lvl].right, wrong: Math.abs(MOVES[lvl].wrong) };
  }

  // Les mêmes points, une fois les cartes Double Trouble et Golden Shield appliquées
  function moves(lvl) {
    const pts = points(lvl);
    return { right: double ? pts.right * 2 : pts.right, wrong: shield ? 0 : pts.wrong };
  }

  // Rappel des cartes actives + choix de l'aidant (Help!!)
  function effectsHTML() {
    const notes = [];
    if (double) notes.push('<strong>Double Trouble</strong> · a right answer counts double!');
    if (shield) notes.push('<strong>Golden Shield</strong> · no move back if you are wrong.');
    if (help) notes.push(`<strong>Help!!</strong> · your helper moves forward ${spaces(HELP_MOVE)} if you are right.`);
    if (!notes.length) return '';
    return `
    <div class="effect-notes">
      ${notes.map((n) => `<p class="effect-note">${n}</p>`).join('')}
      ${help ? `
        <span class="label" id="helper-label">Who helps you?</span>
        <div class="chips" role="group" aria-labelledby="helper-label">
          ${helpers.map((p) => `
            <button type="button" class="chip${p.id === helperId ? ' is-selected' : ''}" data-action="helper" data-id="${p.id}"
                    aria-pressed="${p.id === helperId}">${esc(p.name)}</button>`).join('')}
        </div>` : ''}
    </div>`;
  }

  function timerHTML() {
    const percent = Math.round((timeLeft / TIMER_SECONDS) * 100);
    // Affichage minutes:secondes (1:00, 0:45, 0:09…)
    const minutes = Math.floor(timeLeft / 60);
    const seconds = String(timeLeft % 60).padStart(2, '0');
    return `
    <div class="timer${timeLeft <= 10 ? ' timer--low' : ''}" role="timer" aria-label="${timeLeft} seconds left">
      ${ICONS.hourglass}
      <div class="timer__track"><div class="timer__bar" style="width:${percent}%"></div></div>
      <span class="timer__time">${minutes}:${seconds}</span>
    </div>`;
  }

  function chooseHTML() {
    const cats = CATEGORIES.map((c) => `
      <button type="button" class="cat-btn${c === category ? ' is-selected' : ''}" style="--c: ${SPACE_TYPES[c].color}"
              data-action="category" data-value="${c}" aria-pressed="${c === category}">${SPACE_TYPES[c].label}</button>`).join('');

    const levelButton = (lvl, extraClass) => {
      const pts = moves(lvl);
      return `
      <button type="button" class="level-btn ${extraClass}" data-action="level" data-value="${lvl}">
        <span class="level-btn__title">${lvl.toUpperCase()}</span>
        <span class="level-btn__moves">${movesText(pts.right, pts.wrong)}</span>
      </button>`;
    };

    return `
    <div class="choose">
      <div class="choose__cats">
        <span class="label" id="cat-label">${bonus || swap ? 'Pick any category' : 'Category of your space'}</span>
        <div class="cat-grid" role="group" aria-labelledby="cat-label">${cats}</div>
      </div>
      <h1>${bonus ? `Bonus round, ${name}!` : swap ? `Brain Swap! ${name}, answer for ${esc(player.name)}` : `${name}, pick your level`}</h1>
      ${effectsHTML()}
      <p class="hint">The timer starts as soon as you choose.</p>
      ${bonus
        ? levelButton(bonus.level, bonus.level === 'hard' ? 'level-btn--hard' : '')
        : levelButton('easy', '') + levelButton('hard', 'level-btn--hard')}
    </div>`;
  }

  function cardHTML() {
    const info = SPACE_TYPES[category];
    return `
    <div class="card question-card" style="--c: ${info.color}">
      <div class="card__shine"></div>
      <div class="card__head">
        <span class="tag" style="--tag-color: ${info.color}">${info.label.toUpperCase()}</span>
        <span class="question-card__level">${level === 'hard' ? 'Hard' : 'Easy'}${bonus ? ' · Bonus' : ''}${swap ? ' · Brain Swap' : ''}</span>
      </div>
      <h1 class="card__question">${esc(question.question)}</h1>
      <div class="spacer"></div>
      ${phase === 'judge' ? `
        <div class="answer">
          <span class="label">Answer</span>
          <span class="answer__text">${esc(question.answer)}</span>
        </div>` : ''}
    </div>
    <div class="timer-slot">${timerHTML()}</div>`;
  }

  function resultHTML() {
    const moved = moveSentence(name, result.from, result.to);
    const next = state.phase === 'finished' ? null : currentPlayer(state);
    return `
    <div class="result" style="--c: ${result.right ? 'var(--blue)' : 'var(--accent)'}">
      <h1 class="result__title">${result.right ? 'Correct!' : 'Wrong!'}</h1>
      <span class="result__move">${moved}</span>
      <span class="result__space">${fromTo(result.from, result.to)}</span>
      ${result.notes.map((note) => `<span class="result__note">${note}</span>`).join('')}
    </div>
    <div class="spacer"></div>
    ${next
      ? `<button type="button" class="btn btn--sm" data-action="next">NEXT PLAYER: ${esc(next.name.toUpperCase())}</button>`
      : `<button type="button" class="btn btn--sm" data-action="winner">SEE THE WINNER</button>`}`;
  }

  function draw() {
    let body = '';
    let footer = '';
    if (phase === 'choose') body = chooseHTML();
    if (phase === 'question' || phase === 'judge') body = cardHTML();
    if (phase === 'result') body = resultHTML();

    if (phase === 'question') {
      footer = `
      <div class="spacer"></div>
      <div class="footer-stack">
        <p class="hint hint--center">Answer out loud! Others: stop the clock when ${name} is done.</p>
        <button type="button" class="btn btn--cream btn--sm" data-action="reveal">SHOW ANSWER</button>
      </div>`;
    }
    if (phase === 'judge') {
      footer = `
      <div class="spacer"></div>
      <div class="footer-stack">
        <p class="hint hint--center">${timeLeft === 0 ? "Time's up! " : ''}Other players: was ${name} right?</p>
        <div class="two-buttons">
          <button type="button" class="btn btn--blue btn--sm" data-action="judge" data-value="right">CORRECT</button>
          <button type="button" class="btn btn--sm" data-action="judge" data-value="wrong">WRONG</button>
        </div>
      </div>`;
    }

    // On ne peut revenir en arrière qu'avant d'avoir vu la question
    const canGoBack = phase === 'choose' && !bonus && !swap;
    root.innerHTML = `
    <section class="screen question">
      <div class="topbar topbar--between">
        ${canGoBack ? backButton('back', 'Back to turn') : '<span></span>'}
        <span class="topbar__step">${STEPS[phase]}</span>
      </div>
      ${body}
      ${footer}
    </section>`;
  }

  // Met à jour uniquement le chrono (sans redessiner tout l'écran)
  function tick() {
    const before = timeLeft;
    timeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    // On ne redessine qu'au changement de seconde (les animations du sablier
    // et du chiffre se rejouent ainsi une fois par seconde)
    const slot = root.querySelector('.timer-slot');
    if (slot && timeLeft !== before) slot.innerHTML = timerHTML();
    // Tic-tac pendant les 10 dernières secondes
    if (timeLeft !== before && timeLeft > 0 && timeLeft <= 10) sfx.clock(timeLeft);
    if (timeLeft === 0) {
      sfx.timeUp();
      if (navigator.vibrate) navigator.vibrate(300);
      showAnswer();
    }
  }

  function stopTimer() {
    clearInterval(ticker);
    ticker = null;
  }

  function showAnswer() {
    stopTimer();
    phase = 'judge';
    draw();
  }

  bindActions(root, {
    back() {
      app.go('turn');
    },
    category({ value }) {
      category = value;
      draw();
    },
    level({ value }) {
      level = value;
      question = drawQuestion(state, category, level);
      app.save(); // la question est marquée comme déjà posée
      phase = 'question';
      timeLeft = TIMER_SECONDS;
      deadline = Date.now() + TIMER_SECONDS * 1000;
      draw();
      sfx.start();
      ticker = setInterval(tick, 250);
    },
    reveal() {
      sfx.reveal();
      showAnswer();
    },
    helper({ id }) {
      helperId = Number(id);
      draw();
    },
    judge({ value }) {
      const right = value === 'right';
      const m = moves(level);
      const move = movePlayer(state, answerer.id, right ? m.right : -m.wrong);
      const notes = [];

      // Les cartes gardées servent une seule fois
      if (right && double) {
        setEffect(answerer, 'double', false);
        notes.push('Double Trouble: twice as many spaces!');
      }
      if (shield) {
        setEffect(answerer, 'goldenShield', false);
        if (!right) notes.push('Golden Shield: no move back!');
      }
      if (move.saved) notes.push(`Lucky Break: ${name} ignores the penalty!`);
      if (help) {
        setEffect(answerer, 'help', false);
        const helper = getPlayer(state, helperId);
        if (right) {
          const h = movePlayer(state, helper.id, HELP_MOVE);
          notes.push(`${esc(helper.name)} helped and moves forward to ${spaceName(h.to)}.`);
        } else {
          notes.push(`${esc(helper.name)} helped, but stays where they are.`);
        }
      }
      result = { right, from: move.from, to: move.to, notes };
      if (right) sfx.correct();
      else sfx.wrong();
      if (state.phase !== 'finished') nextTurn(state);
      app.save();
      phase = 'result';
      draw();
    },
    next() {
      app.go('turn');
    },
    winner() {
      app.go('victory');
    }
  });

  draw();

  // Nettoyage : on arrête le chrono si on quitte l'écran
  return stopTimer;
}
