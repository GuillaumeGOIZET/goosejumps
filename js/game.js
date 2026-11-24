/* =========================================================
   Règles du jeu
   Toutes les valeurs « à régler » sont en haut du fichier.
   ========================================================= */

// ---------- Réglages (valeurs provisoires, faciles à changer) ----------

export const FINISH = 52;          // numéro de la case FINISH
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const TIMER_SECONDS = 30;   // durée du chrono des questions

// Déplacement après une question selon le niveau et le jugement
export const MOVES = {
  easy: { right: 1, wrong: -1 },
  hard: { right: 3, wrong: -2 }
};

export const BATTLE_WIN_MOVE = 1;  // le gagnant d'une Battle avance de 1

// Affiche « EXAMPLE CARD · REAL CARDS TO COME » sur les cartes Chance / Special.
// Passer à false quand l'équipe aura fourni les vraies cartes.
export const SHOW_EXAMPLE_CARD_NOTICE = true;

// ---------- Types de cases ----------

// Les 4 catégories de questions
export const CATEGORIES = ['web', 'cyber', 'design', 'marketing'];

// Libellé et couleur (variable CSS) de chaque type de case
export const SPACE_TYPES = {
  web: { label: 'Web', color: 'var(--web)' },
  cyber: { label: 'Cyber', color: 'var(--cyber)' },
  design: { label: 'Design', color: 'var(--design)' },
  marketing: { label: 'Marketing', color: 'var(--marketing)' },
  chance: { label: 'Chance', color: 'var(--chance)', mark: '?' },
  special: { label: 'Special', color: 'var(--special)', mark: '!' },
  battle: { label: 'Battle', color: 'var(--ink)' }
};

// ---------- Données (questions, cartes, plateau) ----------

// Rempli au démarrage par loadData()
export const data = { questions: null, cards: null, board: null };

export async function loadData() {
  const files = ['questions', 'cards', 'board'];
  const results = await Promise.all(
    files.map((name) => fetch(`data/${name}.json`).then((res) => {
      if (!res.ok) throw new Error(`Cannot load data/${name}.json`);
      return res.json();
    }))
  );
  files.forEach((name, i) => { data[name] = results[i]; });
}

/** Type de la case n° `position` sur le plateau physique */
export function spaceTypeAt(position) {
  const spaces = data.board.spaces;
  return spaces[Math.max(0, Math.min(position, spaces.length - 1))];
}

// ---------- Joueurs ----------

export function getPlayer(state, id) {
  return state.players.find((p) => p.id === id);
}

/** Joueur dont c'est le tour */
export function currentPlayer(state) {
  return getPlayer(state, state.turnOrder[state.current]);
}

/** Les autres joueurs (dans l'ordre de jeu) */
export function otherPlayers(state, id) {
  return state.turnOrder.filter((pid) => pid !== id).map((pid) => getPlayer(state, pid));
}

/**
 * Place un joueur sur une case (jamais sous START, jamais après FINISH).
 * Si le joueur atteint FINISH le premier, il gagne la partie.
 * Renvoie { from, to }.
 */
export function setPosition(state, id, position) {
  const player = getPlayer(state, id);
  const from = player.position;
  const to = Math.max(0, Math.min(FINISH, position));
  player.position = to;
  if (to >= FINISH && !state.winnerId) {
    state.winnerId = id;
    state.phase = 'finished';
  }
  return { from, to };
}

/** Avance (delta > 0) ou recule (delta < 0) un joueur */
export function movePlayer(state, id, delta) {
  return setPosition(state, id, getPlayer(state, id).position + delta);
}

/** Passe au joueur suivant (et au tour suivant quand tout le monde a joué) */
export function nextTurn(state) {
  state.current += 1;
  if (state.current >= state.turnOrder.length) {
    state.current = 0;
    state.round += 1;
  }
}

/**
 * Classement : le vainqueur d'abord, puis par case (la plus avancée en premier).
 * En cas d'égalité, on garde l'ordre de jeu.
 */
export function ranking(state) {
  const orderIndex = (p) => state.turnOrder.indexOf(p.id);
  return state.players.slice().sort((a, b) => {
    if (a.id === state.winnerId) return -1;
    if (b.id === state.winnerId) return 1;
    return b.position - a.position || orderIndex(a) - orderIndex(b);
  });
}

// ---------- Tirages sans répétition ----------

/**
 * Tire un élément au hasard dans `pool` sans reprendre un élément déjà tiré
 * (les clés tirées sont stockées dans `used`). Quand tout le paquet a été tiré,
 * on le remet à zéro.
 */
function drawFrom(pool, used, keyOf) {
  let available = pool.filter((item, i) => !used.includes(keyOf(item, i)));
  if (available.length === 0) {
    // Paquet épuisé : on oublie ses éléments et on recommence
    pool.forEach((item, i) => {
      const at = used.indexOf(keyOf(item, i));
      if (at !== -1) used.splice(at, 1);
    });
    available = pool;
  }
  const item = available[Math.floor(Math.random() * available.length)];
  used.push(keyOf(item, pool.indexOf(item)));
  return item;
}

/** Question de catégorie (web/cyber/design/marketing) et de niveau (easy/hard) */
export function drawQuestion(state, category, level) {
  return drawFrom(data.questions[category][level], state.usedQuestions, (q) => q.id);
}

/** Carte Chance ou Special */
export function drawCard(state, deck) {
  return drawFrom(data.cards[deck], state.usedCards, (card) => card.id);
}

/** Question éclair de Battle pour un thème */
export function drawBattleQuestion(state, theme) {
  return drawFrom(data.cards.battle[theme], state.usedBattle, (q, i) => `${theme}-${i}`);
}

// ---------- Lancer de dé pour l'ordre de jeu ----------
// Chaque joueur a une liste de lancers : rolls[id] = [5] ou [5, 2] après une égalité.
// Le 1er lancer = case de départ. Les suivants servent seulement à départager.

export function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

// -1 si a < b, 1 si a > b, 0 si égalité ; null si on ne peut pas encore départager
function compareRolls(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return a.length === b.length ? 0 : null;
}

/**
 * Qui doit lancer le dé maintenant ? Renvoie un id, ou null si l'ordre est fixé.
 * - d'abord, chaque joueur lance une fois ;
 * - ensuite, seuls les joueurs à égalité relancent (autant de fois que nécessaire).
 */
export function nextRoller(players, rolls) {
  const first = players.find((p) => !rolls[p.id] || rolls[p.id].length === 0);
  if (first) return first.id;

  const pending = players.filter((p) => isTied(players, rolls, p.id));
  if (pending.length === 0) return null;
  // Celui qui a lancé le moins de fois relance en premier
  pending.sort((a, b) => rolls[a.id].length - rolls[b.id].length);
  return pending[0].id;
}

/**
 * Le joueur est-il encore à égalité avec quelqu'un ?
 * (seulement une fois que tout le monde a lancé au moins une fois)
 */
export function isTied(players, rolls, id) {
  if (players.some((p) => !rolls[p.id] || rolls[p.id].length === 0)) return false;
  return players.some((q) => {
    if (q.id === id) return false;
    const result = compareRolls(rolls[id], rolls[q.id]);
    return result === 0 || result === null; // pas encore départagés
  });
}

/** Joueurs triés du plus haut lancer au plus bas (une fois l'ordre fixé) */
export function orderFromRolls(players, rolls) {
  return players.slice().sort((a, b) => -compareRolls(rolls[a.id], rolls[b.id]));
}
