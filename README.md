# DevelopGames

Jeu de construction de cité dans le navigateur : on fonde un hameau sur une île et on le développe jusqu'à bâtir la Grande Cathédrale.
JavaScript pur + Canvas, aucune dépendance, jouable sur PC et téléphone (installable comme une appli).

**Jouer :** https://thibut34.github.io/developgames/

## Contenu

- Vue isométrique, île générée au hasard (prairie, terre fertile, forêts, rochers, montagnes, eau).
- 5 ères : Hameau → Village → Bourg → Ville → Cité, puis la merveille finale (victoire).
- 21 bâtiments : habitations, ferme, pêcheur, chasseur, bûcheron, carrière, mine, forge, entrepôt, puits, chapelle, marché, pompiers, tour de garde, taverne, école, comptoir, hôtel des monnaies, jardin, fontaine, statue, parc, Grande Cathédrale.
- Routes : un bâtiment ne fonctionne que s'il est relié à l'hôtel de ville.
- Habitations à 4 niveaux (cabane → maison → maison bourgeoise → villa) selon les services à proximité.
- Ouvriers, bonheur, impôts, entretien, chaînes de production (fer + bois → outils).
- Saisons (pas de récolte en hiver, chauffage au bois), météo, événements (incendies, bandits, épidémies, caravanes, migrants…).
- Objectifs guidés, commerce, statistiques, journal, mini-carte, sons, sauvegarde automatique + export/import.

## Développement

```bash
python serve.py
```

Puis ouvrir http://localhost:8000 (serveur sans cache : chaque modification est visible au rechargement).

- `js/config.js` : toutes les données et l'équilibrage (bâtiments, coûts, ères, objectifs…)
- `js/game.js` : moteur (simulation jour par jour, routes, besoins, événements, sauvegarde)
- `js/world.js` : génération de l'île
- `js/render.js`, `js/draw.js`, `js/sprites.js`, `js/fx.js`, `js/agents.js` : rendu isométrique et effets
- `js/ui.js`, `js/input.js`, `js/minimap.js`, `js/audio.js` : interface, contrôles, mini-carte, sons
- `js/main.js` : boucle de jeu et liaison de l'ensemble

### Test d'équilibrage automatique

http://localhost:8000/tests/simulation.html lance un joueur robot (`tests/bot.js`) sur plusieurs cartes
et affiche son évolution jusqu'à la victoire. Paramètres : `?seeds=1,2,3&days=3000`.

### Mise en ligne

Chaque envoi sur `main` publie automatiquement le jeu sur GitHub Pages (`.github/workflows/mise-en-ligne.yml`).
