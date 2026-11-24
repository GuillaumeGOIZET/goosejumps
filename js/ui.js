/* =========================================================
   Petits outils d'affichage partagés par tous les écrans
   ========================================================= */

import { FINISH } from './game.js';

/**
 * Protège un texte avant de l'insérer dans du HTML
 * (indispensable pour les prénoms tapés par les joueurs).
 */
export function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Icônes SVG en trait (pas d'emoji dans l'interface)
export const ICONS = {
  back: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`,
  leaderboard: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  hourglass: `<svg width="36" height="48" viewBox="0 0 40 52" aria-hidden="true">
    <rect x="4" y="2" width="32" height="6" rx="3" fill="#FF8A1F" stroke="#120C26" stroke-width="3"/>
    <rect x="4" y="44" width="32" height="6" rx="3" fill="#FF8A1F" stroke="#120C26" stroke-width="3"/>
    <path d="M8 8 Q8 22 20 26 Q32 22 32 8 Z M8 44 Q8 30 20 26 Q32 30 32 44 Z" fill="#FFF6E5" stroke="#120C26" stroke-width="3" stroke-linejoin="round"/>
    <path d="M13 41 Q20 33 27 41 Z" fill="#FFD23F"/>
    <path d="M13 12 L27 12 Q24 19 20 21 Q16 19 13 12 Z" fill="#FFD23F"/>
  </svg>`
};

/** Bouton retour carré. `action` = nom de l'action déclenchée au clic. */
export function backButton(action = 'back', label = 'Back') {
  return `<button type="button" class="icon-btn" data-action="${action}" aria-label="${esc(label)}">${ICONS.back}</button>`;
}

/**
 * Relie les boutons d'un écran à leurs fonctions.
 * Dans le HTML : <button data-action="pick" data-id="3">
 * Dans le JS :   bindActions(root, { pick: (data) => … })
 * `data` contient tous les attributs data-* du bouton (data.id = "3").
 */
export function bindActions(root, actions) {
  root.onclick = (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || !root.contains(el) || el.disabled) return;
    const handler = actions[el.dataset.action];
    if (handler) handler(el.dataset, el);
  };
}

/** "1 space" / "3 spaces" */
export function spaces(n) {
  const abs = Math.abs(n);
  return abs + (abs === 1 ? ' space' : ' spaces');
}

/** Nom d'une case : "START", "FINISH" ou "space 14" */
export function spaceName(position) {
  if (position <= 0) return 'START';
  if (position >= FINISH) return 'FINISH';
  return `space ${position}`;
}

/** "Ziad moves forward 3 spaces." / "Ziad moves back 1 space." / "Ziad stays on space 14." */
export function moveSentence(name, from, to) {
  if (to > from) return `${name} moves forward ${spaces(to - from)}.`;
  if (to < from) return `${name} moves back ${spaces(from - to)}.`;
  return `${name} stays on ${spaceName(from)}.`;
}

/** "Space 14 → space 17" (avec majuscule), ou "Still on space 14" */
export function fromTo(from, to) {
  const text = from === to ? `Still on ${spaceName(from)}` : `${spaceName(from)} → ${spaceName(to)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
