# DevelopGames

Jeu de développement de village/cité dans le navigateur. Projet indépendant de StatsFoot (aucun lien).

- JavaScript pur (modules ES) + Canvas, sans dépendance ni build. Node.js n'est pas installé : ne pas en introduire.
- Lancer en local : `python serve.py` (sans cache) puis http://localhost:8000.
- Équilibrage (coûts, production, consommation) : tout dans `js/config.js`.
- Après un changement d'équilibrage ou du moteur (`js/game.js`), lancer `tests/simulation.html` :
  le joueur robot doit toujours atteindre la victoire sans erreur.
- Console du jeu : `DG.give('gold', 500)`, `DG.days(30)` pour tester vite.
- Doit rester jouable sur mobile (tactile, petits écrans) : un portage mobile est prévu plus tard.
- Textes du jeu et messages de commit en français.

## Automatisation

- Après chaque changement vérifié dans le navigateur : commit puis `git push` sur `main`, sans demander.
- Chaque push sur `main` publie le jeu automatiquement sur GitHub Pages
  (workflow `.github/workflows/mise-en-ligne.yml`) : https://thibut34.github.io/developgames/
- Après un push, vérifier que le workflow « Mise en ligne » passe (`gh run list --limit 1`).
