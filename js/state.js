/* =========================================================
   État de la partie + sauvegarde dans localStorage
   On peut fermer l'app et reprendre la partie plus tard.
   ========================================================= */

import { CHARACTERS } from './goose.js';

const STORAGE_KEY = 'goose-jumps-game';
const VERSION = 2; // à augmenter si la forme de l'état change (2 = oies à choisir)

/*
  Forme de l'état :
  {
    version: 2,
    phase: 'setup' | 'order' | 'playing' | 'finished',
    players: [{ id, name, character, position, skipTurns, effects }],
    // character = id d'une oie de goose.js ; effects = cartes gardées ({ luckyBreak: true, … })
    nextId: 3,               // id du prochain joueur créé
    rolls: { [id]: [5, 2] }, // lancers pour l'ordre de jeu
    turnOrder: [id, …],      // ordre de jeu (après les lancers)
    current: 0,              // index dans turnOrder du joueur qui joue
    round: 1,                // numéro du tour
    usedQuestions: [],       // ids des questions déjà posées
    usedCards: [],           // ids des cartes Chance / Special déjà tirées
    usedBattle: [],          // questions éclair déjà posées ("web-0", …)
    winnerId: null
  }
*/

/** Crée un joueur avec la première oie pas encore prise */
export function makePlayer(id, existing = []) {
  const taken = existing.map((p) => p.character);
  const free = CHARACTERS.find((c) => !taken.includes(c.id)) || CHARACTERS[0];
  return { id, name: `Player ${id}`, character: free.id, position: 0, skipTurns: 0, effects: {} };
}

/** Ancienne sauvegarde (v1 : plumes + chapeau) → une oie différente par joueur */
function migrate(saved) {
  if (saved.version === 1 && Array.isArray(saved.players)) {
    saved.players.forEach((p, i) => {
      p.character = CHARACTERS[i % CHARACTERS.length].id;
      delete p.color;
      delete p.hat;
    });
    saved.version = 2;
  }
  return saved;
}

/** État d'une partie neuve. On peut garder les joueurs de la partie précédente. */
export function createState(previousPlayers = null) {
  let players;
  if (previousPlayers && previousPlayers.length) {
    players = previousPlayers.map((p) => ({ ...p, position: 0, skipTurns: 0, effects: {} }));
  } else {
    const first = makePlayer(1);
    players = [first, makePlayer(2, [first])];
  }
  return {
    version: VERSION,
    phase: 'setup',
    players,
    nextId: Math.max(...players.map((p) => p.id)) + 1,
    rolls: {},
    turnOrder: [],
    current: 0,
    round: 1,
    usedQuestions: [],
    usedCards: [],
    usedBattle: [],
    winnerId: null
  };
}

/** Lit la partie sauvegardée (ou en crée une nouvelle) */
export function loadState() {
  try {
    const saved = migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
    if (saved && saved.version === VERSION && Array.isArray(saved.players)) return saved;
  } catch (error) {
    // Sauvegarde illisible : on repart de zéro
  }
  return createState();
}

/** Sauvegarde la partie */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Stockage plein ou désactivé (navigation privée) : la partie continue sans sauvegarde
    console.warn('Goose Jumps: could not save the game.', error);
  }
}

/** Une partie est-elle en cours (à reprendre depuis l'accueil) ? */
export function hasGameInProgress(state) {
  return state.phase === 'order' || state.phase === 'playing';
}
