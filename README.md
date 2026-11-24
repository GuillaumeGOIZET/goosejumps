# GOOSE JUMPS – PWA

Extension digitale du jeu de plateau GOOSE JUMPS (English Game, My Digital School Angers).
Un seul téléphone posé sur la table gère toute la partie. HTML / CSS / JS vanilla, sans framework ni build.

## Lancer en local

Les modules ES et le service worker ne marchent pas en `file://` : il faut un petit serveur.

```bash
# au choix, depuis le dossier goose-jumps/
python -m http.server 8080
npx serve -l 8080
```

Puis ouvrir http://localhost:8080 et passer en vue mobile dans les DevTools (390 × 844).

> **Attention au cache.** Le service worker sert les fichiers depuis le cache (cache-first).
> Pendant le développement, cocher **DevTools → Application → Service workers → Update on reload**,
> sinon tes modifications n'apparaissent pas.

## Où modifier quoi

| Je veux…                                         | Fichier |
|--------------------------------------------------|---------|
| Changer les points (Easy/Hard, Battle), le timer, la case FINISH | `js/game.js` (constantes en haut) |
| Remplacer les cartes Chance / Special d'exemple  | `data/cards.json` (garder le champ `effect`) puis passer `SHOW_EXAMPLE_CARD_NOTICE` à `false` dans `js/game.js` |
| Corriger le type d'une case du plateau           | `data/board.json` |
| Changer une couleur, une police, un arrondi      | `css/tokens.css` |
| Modifier un écran                                | `js/screens/<écran>.js` + `css/screens.css` |
| Ajouter une couleur de plumes ou un chapeau      | `js/goose.js` |
| Régler ou retirer les animations (hover, clic, entrées d'écran) | `css/motion.css` + `js/motion.js` |

Effets de cartes reconnus (`effect.type`) : `move`, `moveOthers`, `swap`, `skipTurn`, `judged`, `bonusQuestion`, `manual`.
Voir le commentaire en haut de `js/screens/event.js`.

## Mettre à jour l'app en production

1. Modifier les fichiers.
2. **Augmenter `CACHE_VERSION`** dans `sw.js` (`'v1'` → `'v2'`…). Sans ça, les téléphones gardent l'ancienne version.
3. Si tu ajoutes un fichier, l'ajouter aussi à la liste `APP_FILES` de `sw.js`.

## Déploiement (HTTPS obligatoire pour la PWA)

Seuls ces fichiers/dossiers sont nécessaires : `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `data/`, `assets/`.
Le dossier `docs/` (maquettes) n'a pas besoin d'être servi.

- **Netlify** (le plus simple) : sur app.netlify.com, *Add new site → Deploy manually*, puis glisser-déposer
  le dossier du projet entier. Ou *Import from Git* avec le dépôt GitHub : pas de commande de build,
  *Publish directory* = `.` (la racine). Les fichiers `_redirects` (cache `docs/`) et `_headers`
  (`sw.js` jamais en cache) sont lus automatiquement par Netlify.
- **GitHub Pages** : pousser le dépôt, puis *Settings → Pages → Deploy from branch → main / root*.
  Tous les chemins sont relatifs, l'app marche aussi dans un sous-dossier (`https://user.github.io/goose-jumps/`).
- **VPS Debian (nginx)** : copier les fichiers dans le dossier du site, activer HTTPS (Certbot) et `gzip on;`
  (penser à `application/json`, `text/css`, `text/javascript`, `application/manifest+json`).
  Servir `sw.js` avec `Cache-Control: no-cache` pour que les mises à jour arrivent vite.

Ensuite, générer le QR code du plateau avec l'URL finale.

## Tests effectués (étape 8)

- Partie complète jouée automatiquement jusqu'à la victoire (tous les types de cases et tous les effets de cartes), avec rechargement en cours de partie.
- Aucune question reposée dans une même partie.
- PWA installable (aucune erreur d'installabilité dans Chrome), fonctionnement hors-ligne après la première visite, polices locales.
- Affichage vérifié à 360 × 640 et 390 × 844, sans défilement horizontal.
- Lighthouse mobile : Performance 96, Accessibilité 91, Bonnes pratiques 100.
  Le seul point d'accessibilité restant est un faux positif : l'outil prend le contour sombre du titre « GOOSE JUMPS » pour la couleur du texte.
