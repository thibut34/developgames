# DevelopGames

Jeu de construction et de gestion de cité dans le navigateur : on fonde un hameau sur une île et on le développe
jusqu'à achever la Grande Cathédrale. JavaScript pur + Canvas, aucune dépendance, jouable sur PC et téléphone
(installable comme une appli).

**Jouer :** https://thibut34.github.io/developgames/

## Contenu

- Vue isométrique, île générée au hasard (prairie, terre fertile, forêts, rochers, montagnes, eau).
- **4 classes d'habitants** (paysans, artisans, bourgeois, nobles), suivies maison par maison, chacune avec ses besoins
  en marchandises et en services. Les maisons évoluent seules quand les besoins de la classe suivante sont prêts ;
  on peut bloquer l'évolution pour garder des ouvriers.
- **Chaînes de production** : poisson ; blé → farine → pain ; laine → tissu ; blé → bière ; bois → planches ;
  bois → charbon ; minerai + charbon → fer → outils ; raisin → vin.
- Ouvriers par classe, impôts, entretien des bâtiments, commerce, caravanes.
- **5 ères** (Hameau, Village, Bourg, Ville, Cité) puis un chantier de 60 jours pour la merveille finale.
- **Incendies** : risque selon le bâtiment, propagation aux voisins, pompiers automatiques, chaîne de seaux, ruines.
- Saisons de 30 jours (hiver sans récolte), météo, événements (bandits, épidémies, migrants…).
- Interface épurée à icônes vectorielles (Lucide), miniatures des bâtiments, calques de vue (eau, marchés,
  chapelles, incendie, beauté, satisfaction), panneaux population / marchandises / finances, objectifs guidés.
- Routes tracées en glissant avec aperçu, démolition et défrichage par zone, clic droit / Échap pour annuler.

## Développement

```bash
python serve.py
```

Puis ouvrir http://localhost:8000 (serveur sans cache : chaque modification est visible au rechargement).

- `js/config.js` : toutes les données et l'équilibrage (classes, marchandises, bâtiments, ères, incendies, objectifs)
- `js/game.js` : moteur (simulation jour par jour, routes, ouvriers, besoins, incendies, événements, sauvegarde)
- `js/world.js` : génération de l'île
- `js/render.js`, `js/draw.js`, `js/sprites.js`, `js/fx.js`, `js/agents.js`, `js/thumbs.js` : rendu et effets
- `js/ui.js`, `js/input.js`, `js/minimap.js`, `js/audio.js`, `js/icons.js` : interface, contrôles, sons, icônes
- `js/main.js` : boucle de jeu et liaison de l'ensemble

### Test d'équilibrage automatique

http://localhost:8000/tests/simulation.html lance un joueur robot (`tests/bot.js`) sur plusieurs cartes
et affiche son évolution jusqu'à la victoire. Paramètres : `?seeds=1,2,3&days=3000`.

### Mise en ligne

Chaque envoi sur `main` publie automatiquement le jeu sur GitHub Pages (`.github/workflows/mise-en-ligne.yml`).

Icônes : [Lucide](https://lucide.dev) (licence ISC).
