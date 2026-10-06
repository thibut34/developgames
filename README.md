# DevelopGames

Jeu de construction et de gestion de cité dans le navigateur : on fonde un hameau sur un archipel et on le développe
jusqu'à achever la Grande Cathédrale. JavaScript pur + Canvas, aucune dépendance, jouable sur PC et téléphone
(installable comme une appli).

**Jouer :** https://thibut34.github.io/developgames/

## Contenu

- **Écran titre** : partie libre (3 difficultés, numéro de carte), **campagne de 8 missions**, 3 emplacements de
  sauvegarde + sauvegarde automatique.
- **Archipel** généré au hasard : une grande île et quatre îles à coloniser (épices, filons d'or, terres fertiles, fer).
  Ports, navires et colonies.
- **4 classes d'habitants** (paysans, artisans, bourgeois, nobles) suivies maison par maison, chacune avec ses besoins
  en marchandises et en services (eau, marché, chapelle, taverne, école, médecin, sécurité, beauté).
- **19 marchandises** et chaînes de production : poisson ; blé → farine → pain ; laine → tissu ; blé → bière ;
  bois → planches ; bois → charbon ; minerai + charbon → fer → outils ; raisin → vin ; épices ; pépites d'or → bijoux.
- **Recherche** : 24 technologies sur 5 ères (bibliothèques, universités).
- Ouvriers par classe, impôts, entretien, commerce, caravanes, épidémies, cambriolages, bandits.
- **Incendies** : risque selon le bâtiment, propagation, pompiers, chaîne de seaux, ruines.
- 5 ères puis un chantier de 120 jours pour la Grande Cathédrale, qui consomme des matériaux chaque jour.
- Saisons de 30 jours, météo, journées de 3 secondes.
- Interface épurée à icônes vectorielles (Lucide), miniatures des bâtiments, calques de vue, panneaux
  population / marchandises / finances / recherche, info-bulles, gestes de construction avec aperçu.

## Développement

```bash
python serve.py
```

Puis ouvrir http://localhost:8000 (serveur sans cache : chaque modification est visible au rechargement).

- `js/config.js` : données et équilibrage (classes, marchandises, bâtiments, ères, technologies, incendies, objectifs)
- `js/scenarios.js` : difficultés et missions de la campagne
- `js/game.js` : moteur (simulation, routes et liaisons maritimes, ouvriers, besoins, incendies, événements, sauvegarde)
- `js/world.js` : génération de l'archipel
- `js/autobuild.js` : joueur automatique (tests d'équilibrage et villes de départ des missions)
- `js/render.js`, `js/draw.js`, `js/sprites.js`, `js/fx.js`, `js/agents.js`, `js/thumbs.js` : rendu et effets
- `js/ui.js`, `js/title.js`, `js/input.js`, `js/minimap.js`, `js/audio.js`, `js/icons.js` : interface et contrôles
- `js/main.js` : boucle de jeu et liaison de l'ensemble

### Test d'équilibrage automatique

http://localhost:8000/tests/simulation.html fait jouer le joueur automatique sur plusieurs cartes jusqu'à la
victoire. Paramètres : `?seeds=1,2,3&days=4000`.

### Mise en ligne

Chaque envoi sur `main` publie automatiquement le jeu sur GitHub Pages (`.github/workflows/mise-en-ligne.yml`).

Icônes : [Lucide](https://lucide.dev) (licence ISC).
