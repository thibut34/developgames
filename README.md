# DevelopGames

Jeu de développement de village/cité dans le navigateur (JavaScript + Canvas, aucune dépendance).

## Lancer le jeu

```bash
python -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Jouer

- **Glisser** pour déplacer la carte, **molette / pincer** pour zoomer.
- Choisir un bâtiment en bas puis toucher la carte pour le construire.
- Les habitants travaillent dans les bâtiments dans l'ordre de construction ; sans assez d'ouvriers, un bâtiment s'endort (💤).
- Chaque habitant mange de la nourriture et paie un peu d'or par jour. La population grandit tant qu'il reste de la place et de quoi manger.
- La partie est sauvegardée automatiquement dans le navigateur.

## Structure

- `js/config.js` — données : bâtiments, coûts, réglages d'équilibrage
- `js/world.js` — génération de la carte
- `js/game.js` — logique (construction, simulation, sauvegarde)
- `js/render.js` — dessin sur le canvas
- `js/input.js` — souris et tactile
- `js/ui.js` — interface HTML
- `js/main.js` — boucle de jeu
