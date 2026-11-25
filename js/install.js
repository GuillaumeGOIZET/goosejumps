/* =========================================================
   Bouton « Install the app » de l'accueil
   Ajoute Goose Jumps sur l'écran d'accueil du téléphone, sans passer
   par le menu du navigateur.

   - Android, Chrome / Edge sur ordinateur : le navigateur envoie l'événement
     `beforeinstallprompt`. On le garde de côté, et le bouton ouvre la vraie
     fenêtre d'installation.
   - iPhone / iPad : Apple ne permet pas d'ouvrir cette fenêtre depuis un site.
     Le bouton affiche donc un petit guide (Partager → Sur l'écran d'accueil).
   - App déjà installée (ouverte depuis son icône) ou navigateur qui ne sait
     pas installer : pas de bouton.

   L'écran d'accueil place `installButton()` dans son HTML. Si l'événement du
   navigateur arrive après l'affichage, le bouton est ajouté tout seul.
   ========================================================= */

import { sfx } from './sound.js';
import { t } from './i18n.js';

let deferredPrompt = null; // événement gardé de côté (Android, Chrome, Edge)

/** L'app est-elle déjà ouverte en mode « appli installée » ? */
function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** iPhone ou iPad (les iPad récents se présentent comme un Mac tactile) */
function isIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/** Quel bouton afficher : 'prompt', 'ios' ou null (aucun) */
function mode() {
  if (isInstalled()) return null;
  if (deferredPrompt) return 'prompt';
  if (isIOS()) return 'ios';
  return null;
}

const DOWNLOAD_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>`;

// Icône « Partager » d'iOS (carré avec une flèche vers le haut)
const SHARE_ICON = `<svg class="install-sheet__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M7 11H5v10h14V11h-2"/></svg>`;

const PLUS_ICON = `<svg class="install-sheet__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;

/** HTML du bouton (vide si l'installation n'est pas possible) */
function buttonHTML() {
  if (!mode()) return '';
  return `<button type="button" class="install-btn" data-install>${DOWNLOAD_ICON}<span>${t('Install the app', 'Installer l’app')}</span></button>`;
}

/** Emplacement du bouton, à mettre dans l'écran d'accueil */
export function installButton() {
  return `<div class="install-slot">${buttonHTML()}</div>`;
}

/** Met à jour le bouton s'il est affiché (l'événement peut arriver en retard) */
function refresh() {
  document.querySelectorAll('.install-slot').forEach((slot) => {
    slot.innerHTML = buttonHTML();
  });
}

// ---------- Guide pour iPhone / iPad ----------
function openIOSGuide() {
  const sheet = document.createElement('div');
  sheet.className = 'install-sheet';
  sheet.innerHTML = `
    <div class="install-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <h2 id="install-title">${t('Add Goose Jumps to your home screen', 'Ajouter Goose Jumps à l’écran d’accueil')}</h2>
      <ol class="install-sheet__steps">
        <li><span class="install-sheet__num">1</span><span>${t(`Tap the <strong>Share</strong> button ${SHARE_ICON} in Safari's toolbar.`, `Touche le bouton <strong>Partager</strong> ${SHARE_ICON} dans la barre de Safari.`)}</span></li>
        <li><span class="install-sheet__num">2</span><span>${t(`Scroll down and tap <strong>Add to Home Screen</strong> ${PLUS_ICON}`, `Descends et touche <strong>Sur l’écran d’accueil</strong> ${PLUS_ICON}`)}</span></li>
        <li><span class="install-sheet__num">3</span><span>${t('Tap <strong>Add</strong>. The goose is now on your home screen!', 'Touche <strong>Ajouter</strong>. L’oie est sur ton écran d’accueil !')}</span></li>
      </ol>
      <button type="button" class="btn btn--sm" data-install-close>${t('GOT IT', 'COMPRIS')}</button>
    </div>`;
  document.body.appendChild(sheet);

  const close = () => {
    sheet.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  sheet.addEventListener('click', (event) => {
    // Fermer avec le bouton, ou en touchant le fond sombre autour du panneau
    if (event.target === sheet || event.target.closest('[data-install-close]')) close();
  });
  sheet.querySelector('[data-install-close]').focus();
}

// ---------- Clic sur le bouton ----------
async function install() {
  if (mode() === 'ios') {
    openIOSGuide();
    return;
  }
  if (!deferredPrompt) return;
  const promptEvent = deferredPrompt;
  deferredPrompt = null; // l'événement ne sert qu'une fois
  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === 'accepted') sfx.correct();
  refresh();
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-install]')) install();
});

// ---------- Événements du navigateur ----------

// Le navigateur dit que l'app peut être installée : on garde l'événement
// (et on empêche sa petite bannière automatique, notre bouton la remplace)
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  refresh();
});

// App installée : le bouton disparaît
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refresh();
});
