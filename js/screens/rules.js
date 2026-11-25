/* =========================================================
   Règles du jeu (version courte, en anglais ou en français)
   Les nombres viennent de game.js : si on change une règle là-bas,
   cet écran se met à jour tout seul.
   ========================================================= */

import { FINISH, MIN_PLAYERS, MAX_PLAYERS, TIMER_SECONDS, MOVES, BATTLE_WIN_MOVE, CATEGORIES, SPACE_TYPES } from '../game.js';
import { backButton, bindActions, spaces } from '../ui.js';
import { t } from '../i18n.js';

const signed = (n) => (n > 0 ? `+${n}` : `−${-n}`);

// "1 minute", "2 minutes" ou "45 seconds"
const duration = (s) => (s % 60 === 0
  ? t(`${s / 60} minute${s === 60 ? '' : 's'}`, `${s / 60} minute${s === 60 ? '' : 's'}`)
  : t(`${s} seconds`, `${s} secondes`));

// Les règles sont recalculées à chaque affichage (selon la langue choisie)
function rules() {
  return [
    {
      title: t('Get ready', 'Préparez-vous'),
      color: 'var(--text)',
      text: t(
        `${MIN_PLAYERS} to ${MAX_PLAYERS} players and one phone for everyone: scan the QR code, then put the phone on the table. Add your names and choose your goose.`,
        `De ${MIN_PLAYERS} à ${MAX_PLAYERS} joueurs et un seul téléphone : scannez le QR code, puis posez le téléphone sur la table. Ajoutez vos prénoms et choisissez votre oie.`
      )
    },
    {
      title: t('Roll for order', "Lancer pour l'ordre"),
      color: 'var(--accent)',
      text: t(
        'Everyone rolls the dice once. The highest roll starts. Ties roll again. Move your goose forward by your roll. After that, no more dice!',
        'Chacun lance le dé une fois. Le plus haut score commence. En cas d’égalité, on relance. Avancez votre oie du nombre obtenu. Ensuite, plus de dé !'
      )
    },
    {
      title: t('Your turn', 'Votre tour'),
      color: 'var(--chance)',
      text: t(
        'Tell the app the colour of your space. It already knows where you are, so it suggests the right one.',
        'Indiquez à l’app la couleur de votre case. Elle sait déjà où vous êtes, elle vous propose donc la bonne.'
      )
    },
    {
      title: CATEGORIES.map((c) => SPACE_TYPES[c].label).join(' · '), // Code · Cyber Security · Design · Marketing
      color: 'var(--web)',
      text: t(
        `Pick Easy or Hard. You have ${duration(TIMER_SECONDS)} to answer out loud, in English. The other players judge your answer.
          Easy: ${signed(MOVES.easy.right)} / ${signed(MOVES.easy.wrong)}. Hard: ${signed(MOVES.hard.right)} / ${signed(MOVES.hard.wrong)}.`,
        `Choisissez Easy ou Hard. Vous avez ${duration(TIMER_SECONDS)} pour répondre à voix haute, en anglais. Les autres joueurs jugent votre réponse.
          Easy : ${signed(MOVES.easy.right)} / ${signed(MOVES.easy.wrong)}. Hard : ${signed(MOVES.hard.right)} / ${signed(MOVES.hard.wrong)}.`
      )
    },
    {
      title: 'Chance & Special',
      color: 'var(--design)',
      text: t(
        'Draw a card and do what it says. Chance cards are always good news. Special cards can be tricky! If a card does not move you, you also move 1 to 3 spaces, so you never get stuck: always forward with Chance, forward or back with Special. Some cards are kept for later: they show under your name until they are used.',
        'Tirez une carte et faites ce qu’elle dit. Les cartes Chance sont toujours une bonne nouvelle. Les cartes Special peuvent être piégeuses ! Si une carte ne vous fait pas bouger, vous bougez aussi de 1 à 3 cases pour ne jamais rester bloqué : toujours en avant avec Chance, en avant ou en arrière avec Special. Certaines cartes sont gardées pour plus tard : elles s’affichent sous votre nom jusqu’à ce qu’elles servent.'
      )
    },
    {
      title: 'Battle',
      color: 'var(--accent)',
      text: t(
        `Challenge a player and pick a theme. First to shout the right answer in English wins and moves forward ${spaces(BATTLE_WIN_MOVE)}.`,
        `Défiez un joueur et choisissez un thème. Le premier qui crie la bonne réponse en anglais gagne et avance de ${spaces(BATTLE_WIN_MOVE)}.`
      )
    },
    {
      title: t('Win the race', 'Gagnez la course'),
      color: 'var(--marketing)',
      text: t(
        `The first goose to reach FINISH (space ${FINISH}) wins! You can never go back further than START.`,
        `La première oie qui atteint FINISH (case ${FINISH}) gagne ! On ne recule jamais plus loin que START.`
      )
    }
  ];
}

export function render(root, app, params) {
  root.innerHTML = `
  <section class="screen rules">
    <div class="topbar">
      ${backButton('back')}
      <h1>${t('How to play', 'Comment jouer')}</h1>
    </div>
    <ol class="rules-list">
      ${rules().map((rule, i) => `
        <li class="rule" style="--c: ${rule.color}">
          <span class="rule__num" aria-hidden="true">${i + 1}</span>
          <div>
            <h2 class="rule__title">${rule.title}</h2>
            <p class="rule__text">${rule.text}</p>
          </div>
        </li>`).join('')}
    </ol>
    <button type="button" class="btn" data-action="back">${t('GOT IT!', "C'EST COMPRIS !")}</button>
  </section>`;

  bindActions(root, {
    back() {
      app.go(params.from || 'home');
    }
  });
}
