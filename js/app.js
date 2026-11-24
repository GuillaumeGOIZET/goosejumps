/* =========================================================
   Point d'entrée + routeur d'écrans
   Un seul écran est affiché à la fois dans <main id="app">.

   Chaque fichier de js/screens/ exporte une fonction :
     render(root, app, params)
   - root   : l'élément <main> à remplir
   - app    : { state, go, save, newGame }
   - params : infos passées par l'écran précédent (ex. { type: 'web' })
   render() peut renvoyer une fonction de nettoyage (ex. arrêter un timer),
   appelée automatiquement quand on change d'écran.
   ========================================================= */

import { loadData } from './game.js';
import { loadState, saveState, createState } from './state.js';
import { enterScreen } from './motion.js';
import { setScreen } from './sound.js';

import * as home from './screens/home.js';
import * as rules from './screens/rules.js';
import * as players from './screens/players.js';
import * as order from './screens/order.js';
import * as turn from './screens/turn.js';
import * as question from './screens/question.js';
import * as event from './screens/event.js';
import * as battle from './screens/battle.js';
import * as ranking from './screens/ranking.js';
import * as victory from './screens/victory.js';

const SCREENS = { home, rules, players, order, turn, question, event, battle, ranking, victory };

const root = document.getElementById('app');
let cleanup = null;

export const app = {
  state: null,
  current: null, // nom de l'écran affiché

  /** Affiche un écran : app.go('turn') ou app.go('question', { type: 'web' }) */
  go(name, params = {}) {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;

    const screen = SCREENS[name];
    if (!screen) throw new Error(`Unknown screen: ${name}`);
    app.current = name;
    setScreen(name); // musique d'ambiance de l'écran (js/sound.js)
    root.onclick = null;
    root.innerHTML = '';
    cleanup = screen.render(root, app, params);
    enterScreen(root); // animation d'arrivée (css/motion.css)

    // Nouvel écran : on remonte en haut et on place le focus sur le titre
    window.scrollTo(0, 0);
    const title = root.querySelector('h1');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
  },

  /** Sauvegarde l'état actuel dans localStorage */
  save() {
    saveState(app.state);
  },

  /** Nouvelle partie : on garde les joueurs (prénoms, oies) mais on remet tout à zéro */
  newGame() {
    app.state = createState(app.state.players);
    app.save();
    app.go('players');
  }
};

// ---------- Démarrage ----------

async function start() {
  try {
    await loadData();
  } catch (error) {
    root.innerHTML = `<div class="screen" style="justify-content:center">
      <h1>Oops!</h1>
      <p class="hint">The game data could not be loaded. Check your connection and reload the page.</p>
    </div>`;
    console.error(error);
    return;
  }
  app.state = loadState();
  app.go('home');
}

// Service worker : met l'app en cache pour jouer hors-ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('Service worker not registered:', error);
    });
  });
}

start();
