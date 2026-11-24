# GOOSE JUMPS – extension digitale (PWA)

Projet scolaire « English Game » (My Digital School Angers), équipe de 4 : Guillaume, Ziad, Mikael, Chiara.
GOOSE JUMPS est un jeu de plateau physique inspiré du jeu de l'oie, joué **en anglais**, avec des questions sur le web, la cyber, le design et le marketing.
Cette PWA est l'extension digitale du jeu : **un seul téléphone ou une tablette posé sur la table** gère toute la partie.

- **Langue de l'interface : anglais.** Les commentaires du code peuvent être en français.
- Le développeur connaît HTML/CSS/JS, PHP, Docker et Git, mais n'a jamais utilisé de framework. Le code doit rester lisible, commenté et simple à modifier par lui.

## Stack et contraintes

- **HTML / CSS / JavaScript vanilla.** Pas de framework, pas de bundler, pas de backend. Modules ES natifs (`<script type="module">`) autorisés.
- **PWA** : `manifest.webmanifest` avec icônes 192 et 512, service worker en cache-first pour tout le shell et les données. L'app doit fonctionner **entièrement hors-ligne** après la première visite.
- **Polices auto-hébergées** dans `assets/fonts/` (Lilita One et Nunito, woff2) pour que l'app marche hors-ligne. Pas d'appel à Google Fonts en production.
- **État de la partie dans `localStorage`** : on peut fermer l'app et reprendre la partie en cours. Prévoir un bouton « New game ».
- Mobile-first, en portrait, à partir de 360 px de large. Cibles tactiles d'au moins 44 px.
- Accessibilité de base : vrais `<button>`, labels sur les inputs, `aria-label` sur les boutons qui n'ont qu'une icône, contraste suffisant.
- Déploiement en HTTPS (VPS Debian du dev ou GitHub Pages). Un QR code sur le plateau renvoie vers l'URL.

Structure suggérée :

```
index.html
manifest.webmanifest
sw.js
css/        (tokens.css, base.css, components.css, screens.css)
js/         (app.js = routeur d'écrans, state.js = état + localStorage, game.js = règles, screens/*.js, goose.js = avatar SVG)
data/       (questions.json, cards.json, board.json) → déjà fournis, ne pas réécrire le contenu
assets/     (fonts/, icons/, sounds/)
docs/       (maquettes, schéma) → référence uniquement, ne pas servir
```

## Données fournies (`data/`)

- `questions.json` : 160 questions validées par l'équipe. Structure `{ web|cyber|design|marketing: { easy: [...20], hard: [...20] } }`, chaque entrée a la forme `{ id, question, answer }`. **Ne pas modifier le contenu.**
- `cards.json` : cartes Chance et Special **d'exemple**, chacune avec un champ `effect` exploitable par l'app, plus les questions éclair des Battles (3 par thème).
- `board.json` : le type de chaque case du plateau physique, indexé par numéro de case (0 = start, 52 = finish).

## Déroulé de la partie

1. Les joueurs scannent le QR code et arrivent sur l'**accueil** (Play / Rules).
2. **Joueurs** : de 2 à 5. Chacun a un prénom et choisit une oie parmi 5 personnages (Sir Honk, Zippy, Daisy, Bowie, Queenie), une oie différente par joueur. Choisir une oie déjà prise échange les oies des deux joueurs.
3. **Ordre de jeu** : chaque joueur lance le dé numérique une seule fois.
   - Le plus haut score commence, et les autres suivent par ordre décroissant.
   - En cas d'égalité, seuls les joueurs à égalité relancent.
   - Le résultat du lancer = le nombre de cases parcourues depuis START au premier tour. **Ensuite, le dé ne sert plus de toute la partie.**
4. **Tour de jeu** : l'écran affiche « It's [name]'s turn! », la barre de progression avec les avatars et un accès au classement.
   - Le joueur indique le type de sa case : Web, Cyber, Design, Marketing, Chance, Special ou Battle.
   - L'app connaît la position de chaque joueur grâce à `board.json`. Elle **pré-sélectionne** donc le bon type, mais le joueur peut le changer.
5. **Case catégorie** (question) :
   1. Le joueur choisit Easy ou Hard. **Le timer de 30 s démarre dès ce choix**, et la question s'affiche.
   2. Le joueur répond à l'oral. Les autres joueurs peuvent arrêter le chrono avec « Show answer ». Sinon, la réponse s'affiche automatiquement à la fin du temps.
   3. Les autres joueurs jugent la réponse avec Correct ou Wrong.
   4. Déplacement (valeurs provisoires, à mettre dans une constante facile à changer) :
      - **Easy** : +1 si la réponse est bonne, −1 si elle est fausse.
      - **Hard** : +3 si la réponse est bonne, −2 si elle est fausse.
   - Ne pas reposer une question déjà tirée dans la partie, tant que la liste n'est pas épuisée.
6. **Chance / Special** : on tire une carte au hasard dans le paquet correspondant. On applique son `effect` (déplacement, échange, tour passé, etc.), ou on laisse les joueurs l'appliquer si `type: "manual"`. Le contenu final sera fourni plus tard par l'équipe.
7. **Battle** (3 cases) :
   1. Le joueur désigne un adversaire, puis choisit un thème.
   2. Une **question éclair très facile** s'affiche, **sans timer**. Le premier qui répond correctement, à voix haute et en anglais, gagne.
   3. On clique sur « Show answer », puis on indique le gagnant : le joueur, l'adversaire ou « Nobody ».
   4. Le gagnant avance d'1 case et l'autre reste sur place. Si personne ne gagne, personne ne bouge.
8. **Fin de partie** : le premier joueur qui atteint ou dépasse la case 52 (FINISH) gagne. On affiche alors un écran de victoire et le classement final.
- Une position ne descend jamais sous 0 (START).
- **Classement** : trié par position, avec le nombre de cases restantes. Il est accessible à tout moment pendant la partie.
- **Rules** : un écran qui reprend ces règles en anglais, en version courte.

## Direction artistique

Les maquettes validées sont dans `docs/mockups/*.dc.html`. Ces fichiers ne sont **pas exécutables seuls** : ils sont écrits pour un éditeur de design. Il faut les lire comme référence : leurs styles inline donnent les tailles, couleurs, espacements et la structure de chaque écran, et leurs blocs `<script>` montrent la logique attendue. Les reproduire fidèlement.

| Maquette | Écran |
|---|---|
| Main | Accueil |
| Players | Joueurs et éditeur d'avatar |
| Order | Lancer pour l'ordre |
| Turn | Tour, barre de progression, choix du type de case |
| Card | Carte question (niveau → timer → réponse → jugement → résultat) |
| Event | Cartes Chance / Special |
| Battle | Battle |
| Ranking | Classement (podium + liste) |
| Board | Plateau imprimé, en référence |

Tokens (à mettre dans `css/tokens.css`) :

- Fond `#2A1F4F`, surface `#3A2C72`, cercles décoratifs `#35286A`, contour et ombre `#120C26`, texte clair `#FFF6E5`, texte secondaire `#C9BDF2`.
- Accent orange `#FF8A1F`.
- Couleurs des catégories (fond) : Code (clé `web`) `#C2D6FF`, Cyber Security (clé `cyber`) `#D699C4`, Design `#DCB8FF`, Marketing `#FFD561`, Chance `#C6DA89` avec contour `#04A339` et un trèfle à 4 feuilles, Special `#F18814` avec contour `#FFF7E7`. L'interface garde `--blue` `#4C8DFF` (bouton Correct) et `--yellow` `#FFD23F` (classement, chrono). Les cases Battle (bouton « VS · Battle ») ont un fond `#F9D0D2` avec un contour et un texte `#E52421`. L'écran Battle lui-même reste sombre et orange.
- Polices : titres en **Lilita One**, texte en **Nunito** (600, 800, 900).
- Style : contours épais (3 à 5 px, `#120C26`), coins arrondis (14 à 28 px) et boutons « en relief » avec `box-shadow: 0 6px 0 #120C26`. On les enfonce au clic avec `translateY` et une ombre réduite.
- Les avatars sont les 5 oies **dessinées par l'équipe** (`assets/icons/gooses.png`), découpées en WebP dans `assets/gooses/` : `<id>.webp` en pied, `<id>-head.webp` pour les petits ronds. Liste et noms dans `js/goose.js`. **Ne pas utiliser** les personnages ni les assets de Goose Goose Duck, qui ne servaient que d'inspiration.
- Pas d'emoji dans l'interface. Les icônes sont des SVG inline en trait.

## Plan de travail (v1)

1. Shell PWA : `index.html`, routeur d'écrans, tokens CSS, manifest, service worker, polices locales.
2. State : modèle de partie, sauvegarde et reprise dans `localStorage`.
3. Écrans Home, Players (avatar SVG), Order (dé animé, égalités).
4. Écran Turn avec barre de progression et classement.
5. Carte question complète : timer, show answer, jugement, déplacement.
6. Chance / Special avec effets, puis Battle.
7. Victoire, Rules, New game.
8. Tests manuels sur mobile, Lighthouse (PWA installable, hors-ligne), puis déploiement.

Avancer **écran par écran**, faire un commit Git à chaque étape et tester dans le navigateur, en vue mobile, avant de passer à la suite.
