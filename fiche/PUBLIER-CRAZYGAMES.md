# Publier DevelopGames sur CrazyGames

Tout est prêt : il te reste seulement à créer ton compte et à remplir le formulaire avec ce qui suit.
(Je ne crée pas de compte et je ne me connecte à rien à ta place.)

## Étapes

1. **Crée ton compte développeur** : https://developer.crazygames.com
2. **Télécharge le zip du jeu** : https://thibut34.github.io/developgames/developgames-crazygames.zip
   (il est refait automatiquement à chaque mise à jour du jeu ; pour une nouvelle version, renvoie simplement ce zip).
3. **Submit a game** → **HTML5** → envoie le zip.
4. **Textes** : copie-colle ceux de la section « Fiche » plus bas.
5. **Images** (dans ce dossier `fiche`) :
   - Landscape 1920×1080 : `cover-1920x1080.png`
   - Portrait 800×1200 : `cover-800x1200.png`
   - Square 800×800 : `cover-800x800.png`
6. **Vidéos** (dans ce dossier, 18 secondes, sans son, commencent par l'image de couverture) :
   - Landscape : `video-1920x1080.mp4`
   - Portrait : `video-1080x1620.mp4`
7. **Options du formulaire** :
   - SDK : **oui**, HTML5 SDK v3.
   - Data Module : **« Yes, using the Data Module »** (les sauvegardes suivent le compte du joueur).
   - Publicités : **rewarded ads uniquement** (aucune publicité imposée, voir plus bas).
   - Orientation : **landscape**.
   - Mobile : oui si tu veux (le jeu se joue au doigt), l'expérience reste meilleure sur ordinateur.
   - Langues : anglais et français.
8. Lance le **QA tool** proposé par le portail, puis envoie pour validation.

CrazyGames commence en général par un **Basic Launch** (une partie des joueurs, sans revenus).
Si le jeu plaît, ils proposent le **Full Launch** avec les revenus publicitaires : rien à changer, c'est déjà intégré.

## Publicités : c'est le joueur qui choisit

- Aucune publicité imposée, jamais.
- Un bouton **cadeau** (dans la colonne de droite, il clignote quand il est disponible) propose :
  « Regardez une courte publicité et recevez de l'or pour votre cité ».
- Le joueur peut refuser. S'il accepte, le jeu se met en pause et le son se coupe pendant la publicité.
- Récompense : au moins 250 or, plus si la ville rapporte beaucoup d'impôts. Un bonus au plus toutes les 5 minutes.
- Ce bouton n'existe que sur CrazyGames (pas sur GitHub Pages).

## Ce qui se passe pour un joueur sur CrazyGames

- Un nouveau joueur arrive **directement dans le jeu** avec le guide « Comment jouer » (CrazyGames préfère éviter les menus au lancement).
  Un joueur qui revient retrouve le menu avec « Continuer ».
- Langue : celle du navigateur, modifiable dans le menu principal ou les options.
- Sauvegardes dans le compte CrazyGames (boutons Exporter / Importer masqués, inutiles là-bas).

## Fiche (en anglais)

**Title** : DevelopGames

**Short description** :
Build a medieval city from a tiny hamlet to the Great Cathedral: production chains, four social classes, research, fires and island colonies.

**Description** :
Found a hamlet on a wild island and grow it into a thriving city.

- Lay roads, build houses and watch them upgrade as your peasants become artisans, burghers and nobles.
- Set up production chains: wheat → flour → bread, wool → cloth, ore and charcoal → iron → tools, grapes → wine, gold → jewellery.
- Keep every class happy: food, water, markets, chapels, taverns, schools, doctors and guards.
- Research 24 technologies in libraries and universities.
- Fight fires and epidemics, repel bandits and survive harsh winters.
- Build harbours and found colonies on spice and gold islands.
- Advance through five eras and complete the Great Cathedral.
- Free play with three difficulty levels and an 8-mission campaign.

**Controls** :
- Mouse: click to build or inspect, drag to move the camera or lay roads, mouse wheel to zoom.
- Right-click or Escape: cancel the current tool. Shift: keep the tool after building.
- Keyboard: arrows to move, R road, X demolish, Space pause.
- Touch: tap to build, drag to move, pinch to zoom.

**Category** : Strategy (ou Simulation)

**Tags** : city builder, strategy, simulation, medieval, management, building, economy, isometric
