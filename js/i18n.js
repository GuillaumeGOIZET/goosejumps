/* =========================================================
   Langue de l'interface : anglais (par défaut) ou français
   Utilisation, directement là où le texte s'affiche :
     t('Back', 'Retour')
     t(`${name} wins!`, `${name} gagne !`)
   → renvoie le texte anglais ou le texte français selon la langue choisie.

   Ce qui reste TOUJOURS en anglais, même en français :
   - les questions et les réponses (c'est un jeu pour pratiquer l'anglais) ;
   - les noms des cases (Code, Cyber Security, Chance, Special, Battle),
     pour coller au plateau imprimé ;
   - les noms des cartes (Lucky Break!, Freeze!…) et des oies.
   ========================================================= */

const LANG_KEY = 'goose-jumps-lang';

function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'fr' ? 'fr' : 'en';
  } catch (error) {
    return 'en';
  }
}

let lang = loadLang();
document.documentElement.lang = lang;

/** Langue actuelle : 'en' ou 'fr' */
export function getLang() {
  return lang;
}

/** Change de langue (et la retient pour la prochaine fois) */
export function setLang(newLang) {
  lang = newLang === 'fr' ? 'fr' : 'en';
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (error) {
    // pas grave : la langue ne sera simplement pas retenue
  }
}

/** Texte anglais ou français selon la langue choisie */
export function t(en, fr) {
  return lang === 'fr' ? fr : en;
}
