/* =========================================================
   Les 5 oies jouables (dessins de l'équipe)
   Images découpées depuis assets/icons/gooses.png, dans assets/gooses/ :
   - <id>.webp      : l'oie en pied (éditeur, podium, victoire, accueil)
   - <id>-head.webp : la tête seule (petits ronds : barre de course, listes…)

   Chaque joueur choisit une oie différente (5 oies = 5 joueurs max).
   `color` sert aux barres de progression du classement.
   ========================================================= */

export const CHARACTERS = [
  { id: 'sir-honk', name: 'Sir Honk', tagline: 'The perfect gentleman', color: '#FF8A1F' },
  { id: 'zippy', name: 'Zippy', tagline: 'Full of energy', color: '#FFD23F' },
  { id: 'daisy', name: 'Daisy', tagline: 'Stylish from beak to feet', color: '#FF7EC2' },
  { id: 'bowie', name: 'Bowie', tagline: 'Never without a bow', color: '#4C8DFF' },
  { id: 'queenie', name: 'Queenie', tagline: 'Born to win', color: '#B89CFF' }
];

/** Oie d'un joueur (ou d'un id d'oie). Oie par défaut si l'id est inconnu. */
export function character(playerOrId) {
  const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.character;
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

/**
 * Image d'une oie.
 * gooseImg('daisy', 64)               → Daisy en pied, 64 px
 * gooseImg('daisy', 40, { head: true }) → la tête seule
 * L'image est décorative (le prénom est toujours écrit à côté) : alt vide.
 */
export function gooseImg(id, size = 64, { head = false } = {}) {
  const c = character(id);
  const file = `assets/gooses/${c.id}${head ? '-head' : ''}.webp`;
  return `<img class="goose" src="${file}" width="${size}" height="${size}" alt="" draggable="false">`;
}

/** Tête de l'oie d'un joueur dans un rond (barre de course, listes, roster) */
export function avatar(player, ring = 48, { active = false } = {}) {
  return `
  <div class="avatar${active ? ' avatar--active' : ''}" style="width:${ring}px;height:${ring}px">
    ${gooseImg(player.character, Math.round(ring * 0.92), { head: true })}
  </div>`;
}
