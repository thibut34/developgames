# DevelopGames

Jeu de développement de village/cité dans le navigateur. Projet indépendant de StatsFoot (aucun lien).

- JavaScript pur (modules ES) + Canvas, sans dépendance ni build. Node.js n'est pas installé : ne pas en introduire.
- Lancer en local : `python serve.py` (sans cache) puis http://localhost:8000.
- Équilibrage (coûts, production, consommation) : tout dans `js/config.js`.
- Après un changement d'équilibrage ou du moteur (`js/game.js`), lancer `tests/simulation.html` :
  le joueur robot doit toujours atteindre la victoire sans erreur.
- Console du jeu : `DG.give('gold', 500)`, `DG.days(30)` pour tester vite.
- Le joueur automatique (`js/autobuild.js`) sert aux tests ET à préparer les villes de départ des missions
  (`js/scenarios.js`) : s'il est modifié, vérifier aussi qu'une mission avec `prebuild` démarre bien.
- Si le format de l'état change (taille de carte, structure), incrémenter la version de sauvegarde dans `js/game.js`
  (`SAVE_KEY` + `v`) pour ignorer proprement les anciennes sauvegardes.
- Objectif de durée voulu par l'utilisateur : au moins 10 h de jeu (partie libre + campagne).
- Style voulu par l'utilisateur : épuré et « pro ». **Aucun émoji** dans le jeu : icônes Lucide (`js/icons.js`,
  à régénérer depuis unpkg `lucide-static` si besoin d'une nouvelle icône) et miniatures dessinées (`js/thumbs.js`).
- Maniabilité : l'outil de construction se désélectionne après usage (option pour le garder), clic droit / Échap annulent.
- Doit rester jouable sur mobile (tactile, petits écrans) : un portage mobile est prévu plus tard.
- Textes du jeu et messages de commit en français. Le jeu existe aussi en anglais : tout texte affiché passe par
  `L('français', 'english')` (`js/i18n.js`) ; les données (bâtiments, objectifs, missions…) ont leur version
  anglaise dans `js/lang-en.js`. Tester les deux langues (choix dans le menu principal ou les options).
- Portails de jeux (`js/platform.js`) : sur CrazyGames, sauvegardes via le SDK (`store`, jamais `localStorage`
  directement), phases de jeu signalées, publicités uniquement « rewarded » proposées au joueur (bouton cadeau), jamais imposées (choix de l'utilisateur), désactivées tant que le zip n'a pas data-ads="on" (interdites en Basic Launch). Test local :
  http://localhost:8000/?platform=crazygames. Fiche, couvertures et guide de publication : dossier `fiche/`.

## Automatisation

- Après chaque changement vérifié dans le navigateur : commit puis `git push` sur `main`, sans demander.
- Chaque push sur `main` publie le jeu automatiquement sur GitHub Pages
  (workflow `.github/workflows/mise-en-ligne.yml`) : https://thibut34.github.io/developgames/
- Après un push, vérifier que le workflow « Mise en ligne » passe (`gh run list --limit 1`).
- Le même workflow fabrique le zip CrazyGames : https://thibut34.github.io/developgames/developgames-crazygames.zip
