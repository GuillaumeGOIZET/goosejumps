/* =========================================================
   Avatar d'oie en SVG modulaire (dessin original)
   Corps arrondi + gros yeux + bec orange + chapeau optionnel.
   Les formes reprennent exactement les maquettes (viewBox 0 0 100 100).
   ========================================================= */

// Couleurs de plumes proposées dans l'éditeur
export const FEATHERS = [
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#9FD6FF', label: 'Sky' },
  { hex: '#FFD23F', label: 'Sun' },
  { hex: '#FF7EC2', label: 'Bubblegum' },
  { hex: '#2FD3B0', label: 'Mint' },
  { hex: '#B89CFF', label: 'Lilac' }
];

// Chapeaux proposés ('none' = pas de chapeau)
export const HATS = [
  { id: 'top', label: 'Top hat' },
  { id: 'cap', label: 'Cap' },
  { id: 'crown', label: 'Crown' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'none', label: 'No hat' }
];

const INK = '#120C26';
const ORANGE = '#FF8A1F';

// Dessin de chaque chapeau (posé sur le haut du corps, y ≈ 24)
const HAT_SVG = {
  top: `
    <rect x="35" y="5" width="30" height="18" rx="3" fill="${INK}"/>
    <rect x="35" y="16" width="30" height="4" fill="${ORANGE}"/>
    <rect x="25" y="21" width="50" height="5" rx="2.5" fill="${INK}"/>`,
  cap: `
    <path d="M30 28 Q50 4 70 28 Z" fill="#4C8DFF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="62" y="23" width="24" height="7" rx="3.5" fill="#4C8DFF" stroke="${INK}" stroke-width="3"/>`,
  crown: `
    <path d="M33 28 L35 10 L43 20 L50 6 L57 20 L65 10 L67 28 Z" fill="#FFD23F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  beanie: `
    <path d="M30 30 Q30 8 50 8 Q70 8 70 30 Z" fill="#FF7EC2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="50" cy="7" r="5" fill="#FFF6E5" stroke="${INK}" stroke-width="3"/>`,
  none: ''
};

// Décalage des pupilles selon la direction du regard
const LOOK = { center: [2, 1], right: [4, 0], left: [-6, 0] };

/**
 * Renvoie le code SVG d'une oie.
 * @param {object} options
 * @param {string} options.color  couleur des plumes
 * @param {string} options.hat    'top' | 'cap' | 'crown' | 'beanie' | 'none'
 * @param {number} options.size   taille en pixels
 * @param {string} options.look   'center' | 'right' | 'left'
 * @param {boolean} options.wing  affiche une aile (grande oie de l'accueil)
 * @param {boolean} options.shadow ombre portée sous l'oie
 */
export function gooseSVG({ color = '#FFFFFF', hat = 'none', size = 64, look = 'center', wing = false, shadow = false } = {}) {
  // Plus l'oie est petite, plus le trait doit être épais pour rester lisible
  const body = size < 40 ? 6 : size < 56 ? 5 : 4;
  const line = size < 40 ? 4 : 3;
  const [dx, dy] = LOOK[look] || LOOK.center;

  return `
  <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    ${shadow ? `<ellipse cx="50" cy="96" rx="26" ry="4" fill="${INK}" opacity="0.4"/>
    <path d="M38 90 L34 96 L42 96 Z M62 90 L58 96 L66 96 Z" fill="${ORANGE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : ''}
    <rect x="28" y="24" width="44" height="68" rx="22" fill="${color}" stroke="${INK}" stroke-width="${body}"/>
    ${wing ? `<path d="M28 66 Q18 60 20 50 Q28 56 32 58 Z" fill="#E9E3F7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : ''}
    <circle cx="41" cy="44" r="9" fill="#FFFFFF" stroke="${INK}" stroke-width="${line}"/>
    <circle cx="59" cy="44" r="9" fill="#FFFFFF" stroke="${INK}" stroke-width="${line}"/>
    <circle cx="${41 + dx}" cy="${44 + dy}" r="4" fill="${INK}"/>
    <circle cx="${59 + dx}" cy="${44 + dy}" r="4" fill="${INK}"/>
    <path d="M36 57 Q50 50 64 57 Q50 68 36 57 Z" fill="${ORANGE}" stroke="${INK}" stroke-width="${line}" stroke-linejoin="round"/>
    ${HAT_SVG[hat] || ''}
  </svg>`;
}

/**
 * Oie d'un joueur dans un rond (comme dans les maquettes).
 * @param {object} player  { color, hat }
 * @param {number} ring    diamètre du rond en px
 * @param {object} extra   options passées à gooseSVG + active (contour orange)
 */
export function avatar(player, ring = 48, extra = {}) {
  const { active = false, ...options } = extra;
  const size = Math.round(ring * 0.82);
  return `
  <div class="avatar${active ? ' avatar--active' : ''}" style="width:${ring}px;height:${ring}px">
    ${gooseSVG({ color: player.color, hat: player.hat, size, ...options })}
  </div>`;
}
