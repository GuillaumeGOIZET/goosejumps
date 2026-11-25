/* =========================================================
   Écran d'accueil (maquette Main)
   PLAY / RULES, ou CONTINUE / NEW GAME si une partie est en cours.
   ========================================================= */

import { bindActions } from '../ui.js';
import { hasGameInProgress } from '../state.js';
import { soundButton } from '../sound.js';
import { installButton } from '../install.js';
import { attachMascot } from '../mascot.js';
import { t, getLang, setLang } from '../i18n.js';

export function render(root, app) {
  const inProgress = hasGameInProgress(app.state);

  root.innerHTML = `
  <section class="screen home">
    <div class="deco" style="top:-60px;right:-70px;width:220px;height:220px"></div>
    <div class="deco" style="bottom:120px;left:-90px;width:200px;height:200px"></div>
    ${soundButton('home__sound')}
    <!-- Bouton de langue : affiche la langue vers laquelle on passe -->
    <button type="button" class="icon-btn home__lang" data-action="lang"
            aria-label="${t('Passer en français', 'Switch to English')}" lang="${t('fr', 'en')}">${t('FR', 'EN')}</button>

    <p class="home__kicker">ENGLISH GAME · 2026</p>

    <h1 class="home__title">
      <span class="home__goose">GOOSE</span>
      <span class="home__jumps">JUMPS</span>
    </h1>

    <button type="button" class="home__mascot" aria-label="${t('Poke Sir Honk', 'Taper Sir Honk')}" data-silent>
      <span class="mascot__shadow" aria-hidden="true"></span>
      <!-- Sir Honk sans son ombre : l'ombre est dessinée à part pour rester au sol quand il tombe -->
      <img class="goose" src="assets/gooses/sir-honk-solo.webp" width="210" height="210" alt="" draggable="false">
      <span class="mascot__stars" aria-hidden="true">
        <span class="mascot__star"><span><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="#FFD23F" stroke="#120C26" stroke-width="2" stroke-linejoin="round"/></svg></span></span>
        <span class="mascot__star"><span><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="#FFD23F" stroke="#120C26" stroke-width="2" stroke-linejoin="round"/></svg></span></span>
        <span class="mascot__star"><span><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="#FFD23F" stroke="#120C26" stroke-width="2" stroke-linejoin="round"/></svg></span></span>
      </span>
    </button>

    <div class="home__pills">
      <span class="pill" style="--c: var(--web)">CODE</span>
      <span class="pill" style="--c: var(--cyber)">CYBER SECURITY</span>
      <span class="pill" style="--c: var(--design)">DESIGN</span>
      <span class="pill" style="--c: var(--marketing)">MARKETING</span>
    </div>

    <div class="spacer"></div>

    <div class="home__actions">
      ${inProgress
        ? `<button type="button" class="btn home__play" data-action="continue">${t('CONTINUE', 'CONTINUER')}</button>
           <button type="button" class="btn btn--cream" data-action="newGame">${t('NEW GAME', 'NOUVELLE PARTIE')}</button>`
        : `<button type="button" class="btn home__play" data-action="play">${t('PLAY', 'JOUER')}</button>`}
      <button type="button" class="btn btn--cream" data-action="rules">${t('RULES', 'RÈGLES')}</button>
    </div>
    ${installButton()}
    <p class="home__credits">Guillaume · Ziad · Mikael · Chiara</p>
  </section>`;

  bindActions(root, {
    play() {
      // Partie terminée : on en relance une avec les mêmes joueurs
      if (app.state.phase === 'finished') app.newGame();
      else app.go('players');
    },
    continue() {
      app.go(app.state.phase === 'order' ? 'order' : 'turn');
    },
    newGame() {
      if (confirm(t('Start a new game? The current game will be lost.', 'Commencer une nouvelle partie ? La partie en cours sera perdue.'))) app.newGame();
    },
    rules() {
      app.go('rules', { from: 'home' });
    },
    lang() {
      setLang(getLang() === 'fr' ? 'en' : 'fr');
      // Prénoms par défaut (« Player 2 » ↔ « Joueur 2 ») traduits eux aussi
      app.state.players.forEach((p) => {
        const match = p.name.match(/^(Player|Joueur) (\d+)$/);
        if (match) p.name = t(`Player ${match[2]}`, `Joueur ${match[2]}`);
      });
      app.save();
      app.go('home'); // on redessine l'accueil dans la nouvelle langue
    }
  });

  // L'oie qu'on peut taper (js/mascot.js) ; nettoyage quand on quitte l'écran
  return attachMascot(root.querySelector('.home__mascot'));
}
