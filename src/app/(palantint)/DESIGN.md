# Design de PalantINT

Dernière mise à jour : 2026-11-11.

Ce document est le contrat visuel de l’espace privé `/palantint` et de ses composants partagés. Il consigne les choix confirmés par l’utilisateur et les motifs présents dans la navigation, l’accueil et les cartes. Toute création ou modification d’interface PalantINT doit les respecter, y compris les cartes 2D/3D, le graphe, les formulaires et l’administration.

Le portail public conserve sa direction propre, décrite dans [son DESIGN.md](../(portal)/DESIGN.md). Adapter un composant partagé doit préserver la présentation de chaque espace.

## Identité visuelle

PalantINT conserve son esthétique sombre, technique et sobre : surfaces Zinc, contours fins, angles droits, données lisibles et accents limités aux fonctions utiles. Une nouvelle page doit appartenir à la même application que la navbar et les pages existantes.

- Fond principal : `bg-zinc-950` ; surfaces secondaires : `bg-zinc-900/20` à `bg-zinc-900/40`.
- Panneaux superposés : `bg-zinc-950/95`, `border border-zinc-800`, avec `backdrop-blur-xl` lorsque le contenu reste lisible.
- Formes : `rounded-none` pour les boutons, menus, panneaux, champs et fiches. Les cercles restent possibles pour représenter une donnée, un nœud ou un indicateur.
- Texte principal blanc ou Zinc clair ; texte secondaire Zinc atténué, avec un contraste suffisant pour rester lisible.
- Grilles, pointillés et lueurs restent discrets. Une ombre sert à détacher un panneau flottant ; elle ne doit ni masquer les données ni envahir le survol d’un créneau.
- Réutiliser les composants et classes existants avant d’introduire une autre famille de contrôles.

### Couleurs sémantiques

Les références sont `src/lib/colors.ts` et les tokens Tailwind de `src/app/globals.css`. Utiliser leurs noms sémantiques dans les nouveaux composants.

| Usage privé | Token | Accent |
| --- | --- | --- |
| Personnes | `student` | Bleu |
| Associations | `orga` | Émeraude |
| Logements | `housing` | Orange |
| Relations | `network` | Cyan |
| Carte du campus | `campus` | Violet |
| Emplois du temps | `timetable` | Jaune |
| Laverie privée, médias | `media` | Fuchsia |
| Communications, actions de suppression | `comms` | Rouge |
| Impressions (partage de quota followme) | `print` | Citron vert |

La carte utilise l’accent `campus`, distinct de `housing`. La laverie privée conserve sa palette `media` d’origine ; une modification des cartes ou de la navigation ne justifie pas de changer ses couleurs.

## Typographie et langage

- Titres structurants : graisse forte, géométrie simple et hiérarchie nette ; grandes capitales réservées aux titres et repères courts.
- Navigation, contrôles, libellés de données : `font-mono`, avec des capitales et un espacement modéré pour les repères courts.
- Texte descriptif : phrases lisibles, sans imposer les capitales à de longs paragraphes. Inter est une police sans empattement, pas une police monospace.
- Utiliser un langage naturel professionnel : « Ajouter une relation », « Choisir un bâtiment », « Emploi du temps ». Éviter les formulations théâtrales, le jargon d’opérateur et les identifiants techniques visibles sans nécessité.
- Les mêmes exigences de clarté s’appliquent aux interfaces CLI et aux messages de synchronisation.

## Navigation

Conserver le style PalantINT de `src/components/Navbar.tsx` : barre sombre, contours fins, typographie monospace et commandes compactes à angles droits.

- Le logo renvoie vers l’accueil `/palantint`.
- Les destinations sont regroupées en **Campus**, **Annuaire** et **Services** ; les associations appartiennent à **Annuaire**.
- L’administration est une commande avec une icône de bouclier **à côté du compte utilisateur**, visible pour les administrateurs. Elle ne doit pas revenir comme une rubrique de navigation principale.
- La recherche principale reste centrée sur les résultats et leur destination ; ne pas réintroduire de bouton **Compare / Comparer** dans ces résultats.
- Les menus fonctionnent au clic et au clavier, se ferment avec Échap et au clic extérieur. Le menu mobile conserve les mêmes destinations et leur hiérarchie.

## Accueil

Conserver la page d’accueil PalantINT, sa hiérarchie et l’accès à ses modules. Le campus est accessible par un bouton secondaire compact, « Explorer le campus » : contour Zinc, fond discret, petite icône et accent `campus` contenu.

Ce bouton ne doit pas devenir un grand bandeau, une carte promotionnelle, un nouveau hero ou une action qui domine la page. L’accueil ne doit pas être remplacé par la carte à l’occasion d’une retouche de navigation.

## Cartes 2D et 3D

La carte est le contenu principal. Son interface reprend le langage visuel de la navbar : panneaux Zinc, angles droits, monospace, bordures fines et accent `campus` pour la sélection.

- **Une seule carte.** Plan, satellite et 3D sont trois vues de la même carte MapLibre, pas des composants séparés. Recherche, bâtiment, étage, lieu et URL (`view`) sont partagés ; changer de vue conserve la sélection.
- **Un seul sélecteur de vue**, en bas au centre : « Plan » (fond OpenStreetMap local), « Satellite » (orthophoto IGN), « 3D ». Chaque vue apporte ses propres fonds : pas d’interrupteur de couche séparé. La 3D affiche toujours la photogrammétrie du campus (scan calibré, référence là où il existe) et le relief LiDAR IGN des alentours (terrain + sursol), jamais dessiné sous le scan.
- Les plans historiques placés géographiquement remplacent les salles Wemap qu’ils couvrent : leurs numéros font foi. Les autres bâtiments gardent les salles Wemap.
- **Recherche seule en haut à gauche** ; le sélecteur de bâtiment a été retiré. La recherche vide propose les bâtiments, la recherche saisie les lieux ; un clic sur un bâtiment de la carte le sélectionne.
- **Panneau latéral gauche** (pleine hauteur, façon cartographie grand public ; feuille basse sur mobile) dès qu’un bâtiment ou un lieu est sélectionné :
  - bâtiment : silhouette, nom, niveaux, résumé de chaque résidence (logements et occupés, nombre et loyers par type, lien Laverie), liste des lieux de l’étage actif ;
  - lieu : retour au bâtiment, titre et niveau, rangée d’actions libellées (agenda, disponibilités, copier le lien), fiche logement d’un appartement (type, surface, loyer, montants boursier et non boursier après aide), occupants et associations (logo, nom, lien), prochains événements, informations (bâtiment, niveau, surface, catégories, horaires, accès, source Wemap ou plan historique). Les liens laverie restent visibles.
- **Résidence hors carte.** Une résidence dont aucun étage n’est placé géographiquement (U6, en centre-ville d’Évry) s’affiche dans la même page : son plan historique, en coordonnées de plan, remplace la zone de carte, avec le même panneau, le même rail d’étages, la même recherche et les mêmes paramètres d’URL. La mention « Résidence hors campus · plan non géolocalisé » l’indique ; les vues Plan/Satellite/3D et les commandes de carte sont masquées. Ne pas lui inventer de position.
- **La carte remplace les pages Logements et Foyer.** `/palantint/apartments` et `/palantint/foyer` redirigent vers la sélection correspondante de la carte ; ne pas recréer de visionneuse de plan séparée. Les liens internes vers un logement ou un local utilisent `campusHref({ room })`. Hors connexion, le portail public garde ses propres pages.
- **Quitter une sélection** pas à pas : la croix du panneau quitte le bâtiment, la flèche revient du lieu au bâtiment ; Échap et un clic sur une zone vide de la carte remontent d’un niveau.
- En 3D, la sélection d’un bâtiment estompe les surfaces et extrude l’étage actif à sa hauteur.
- **Commandes de navigation thémées** en bas à droite (vue d’ensemble, noms des lieux, zoom, boussole en 3D), sans les contrôles MapLibre par défaut.

- Donner la priorité à l’espace de carte, avec des commandes compactes superposées. Éviter les grands panneaux explicatifs permanents ; le panneau latéral n’apparaît qu’avec une sélection.
- Les bâtiments se reconnaissent par leur **silhouette** et un nom court. Référence : `src/components/palantint/BuildingOutline.tsx`.
- Les étages utilisent un **rail compact**, avec un état sélectionné visible et « RDC » pour le niveau géographique zéro. Les valeurs et libellés viennent des données serveur.
- Les noms de lieux, surbrillances, contours et états actifs doivent permettre de comprendre la sélection avec un minimum de texte.
- Conserver bâtiment, salle et étage lorsque la correspondance serveur permet de passer entre les vues. Ne pas confondre les valeurs d’étage des anciens plans avec celles du GeoJSON.
- **Pas d’icône d’information générique en 3D ni de bouton de téléchargement/export GeoJSON dans l’interface cartographique.** Les API et les outils techniques restent distincts des commandes proposées à l’utilisateur de la carte.
- Ne pas ajouter de contrôle sans action utile et compréhensible. Un problème réel de chargement ou d’alignement doit rester identifiable et permettre une récupération adaptée.

Références d’implémentation : `palantint/campus/page.tsx`, `CampusMap.tsx`, `CampusPanel.tsx`, `MapControls.tsx` et `reliefLayer.ts` sous ce groupe de routes.

## Interactions et accessibilité

Une interface principalement visuelle reste utilisable sans deviner ses icônes.

- Chaque bouton à icône possède un nom accessible (`aria-label`) et une infobulle lorsque cela aide à comprendre son action.
- Exposer les états actifs avec `aria-pressed`, les menus avec `aria-expanded`, et conserver un focus clavier visible.
- Associer la couleur à un contour, une forme, une icône ou un libellé d’état ; la couleur seule ne suffit pas.
- Préserver des cibles tactiles utilisables, l’accès clavier, les commandes essentielles sur mobile et la lisibilité des contenus superposés.
- Favoriser les transitions courtes de couleur et de bordure. Les mouvements et effets lumineux doivent rester discrets et utiles.

## Vérification avant livraison

Pour une modification visuelle, contrôler la cohérence avec la navbar et une page du même module, la palette sémantique, les états de survol/focus/sélection, ainsi que l’usage sur petit écran. Pour les cartes, vérifier la recherche, le panneau latéral et la sortie de sélection, le rail d’étages, les trois vues et la présence de la photogrammétrie en 3D.

Les choix explicites ci-dessus ne doivent pas être remplacés par les valeurs par défaut d’une bibliothèque de composants. Toute nouvelle convention approuvée par l’utilisateur doit être consignée ici pour les modifications suivantes.
