# Design de PalantINT

Dernière mise à jour : 2026-11-11 (règles de stabilité du panneau et de rendu de la carte, signets, actions des lieux).

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
- **Recherche en haut à gauche**, suivie du bouton **Signets** ; le sélecteur de bâtiment a été retiré. La recherche vide propose les bâtiments, la recherche saisie les lieux ; un clic sur un bâtiment de la carte le sélectionne.
- **Signets** : propres à chaque utilisateur et conservés par le serveur (`/maps/indoor/bookmarks`), donc retrouvés sur tous ses appareils. Le bouton à côté de la recherche affiche leur nombre et ouvre leur liste (nom, bâtiment, étage, ouvrir, retirer) ; la fiche d’un lieu les ajoute ou les retire ; la carte les marque en ambre (accent `timetable`).
- **Panneau latéral gauche** (pleine hauteur, façon cartographie grand public) dès qu’un bâtiment ou un lieu est sélectionné. Sur mobile, c’est une feuille basse à deux tailles : réduite, elle ne montre que l’en-tête compact (≈ 10 % de la hauteur, 88 px au moins : la carte reste utilisable), agrandie ≈ 88 % ; la poignée (toucher ou glisser) passe de l’une à l’autre ; elle s’ouvre réduite et disparaît sans sélection :
  - en-tête compact : une ligne de titre et une ligne de repères (niveaux et bâtiment, ou nombre de niveaux et étage actif), retour ou silhouette de 32 px, fermeture ; le chargement du lieu s’y signale ;
  - bâtiment : résumé de chaque résidence (logements et occupés, nombre et loyers par type, lien Laverie), liste des lieux de l’étage actif ;
  - lieu, dans cet ordre : fiche logement d’un appartement (statut, type, surface, loyer, montants boursier et non boursier après aide), occupants et associations (logo, nom, lien), informations non redondantes (surface hors logement, catégories, horaires, accès ; le bâtiment et le niveau restent dans l’en-tête, la source n’est pas affichée), l’agenda, **puis** la rangée d’actions libellées et, sous elle, ce que les actions affichent. Pas de pastilles bâtiment ou laverie dans la fiche d’un lieu : elles restent dans la vue bâtiment.
  - rangée d’actions : Agenda, Présents, Groupes (salle avec agenda) ; Disponibilités, Localiser, Cercle, Même promo, Historique, Note pour les administrateurs (logement occupé) ; Membres (local associatif) ; puis Vue immersive, Signet et Copier le lien, toujours présents et en dernier.
  - agenda : vrai agenda d’une journée (créneaux horaires, événements en blocs, ligne de l’heure actuelle), jours précédent/suivant, retour à aujourd’hui, saut au prochain jour occupé. Sa hauteur est limitée et il défile seul, pour que les informations du lieu restent visibles au-dessus.
- **Résidence hors carte.** Une résidence dont aucun étage n’est placé géographiquement (U6, en centre-ville d’Évry) s’affiche dans la même page : son plan historique, en coordonnées de plan, remplace la zone de carte, avec le même panneau, le même rail d’étages, la même recherche et les mêmes paramètres d’URL. La mention « Résidence hors campus · plan non géolocalisé » l’indique ; les vues Plan/Satellite/3D et les commandes de carte sont masquées. Ne pas lui inventer de position.
- **La carte remplace les pages Logements et Foyer.** `/palantint/apartments` et `/palantint/foyer` redirigent vers la sélection correspondante de la carte ; ne pas recréer de visionneuse de plan séparée. Les liens internes vers un logement ou un local utilisent `campusHref({ room })`. Hors connexion, le portail public garde ses propres pages.
- **Quitter une sélection** pas à pas : la croix du panneau quitte le bâtiment, la flèche revient du lieu au bâtiment ; Échap et un clic sur une zone vide de la carte remontent d’un niveau.
- En 3D, la sélection d’un bâtiment estompe les surfaces et extrude l’étage actif à sa hauteur.
- **Occupation des logements** : les logements occupés sont orange (accent `housing`, fond `#9a3412`, contour `#fb923c`), les libres verts (fond `#065f46`, contour `#34d399`), sur le plan, l’étage 3D et le plan hors carte. Le panneau bâtiment affiche la légende avec les nombres de l’étage et marque chaque logement de sa liste ; la fiche d’un logement commence par son statut. Les lieux ne portent pas de mention de source (« plan », Wemap).
- **Commandes de navigation thémées** en bas à droite (vue d’ensemble, noms des lieux, zoom, boussole en 3D), sans les contrôles MapLibre par défaut.
- **Personnes sur la carte** : Cercle, Même promo, Présents et Membres placent des personnes dans leurs logements (points violets, accent `campus`) reliés au lieu de départ par des tirets. Le résultat reste affiché pendant qu’on ouvre d’autres lieux ; sa liste suit la rangée d’actions, et un bandeau en bas du panneau permet de l’effacer depuis un bâtiment.

- Donner la priorité à l’espace de carte, avec des commandes compactes superposées. Éviter les grands panneaux explicatifs permanents ; le panneau latéral n’apparaît qu’avec une sélection.
- Les bâtiments se reconnaissent par leur **silhouette** et un nom court. Référence : `src/components/palantint/BuildingOutline.tsx`.
- Les étages utilisent un **rail compact**, avec un état sélectionné visible et « RDC » pour le niveau géographique zéro. Les valeurs et libellés viennent des données serveur.
- Les noms de lieux, surbrillances, contours et états actifs doivent permettre de comprendre la sélection avec un minimum de texte.
- Conserver bâtiment, salle et étage lorsque la correspondance serveur permet de passer entre les vues. Ne pas confondre les valeurs d’étage des anciens plans avec celles du GeoJSON.
- **Pas d’icône d’information générique en 3D ni de bouton de téléchargement/export GeoJSON dans l’interface cartographique.** Les API et les outils techniques restent distincts des commandes proposées à l’utilisateur de la carte.
- Ne pas ajouter de contrôle sans action utile et compréhensible. Un problème réel de chargement ou d’alignement doit rester identifiable et permettre une récupération adaptée.

Références d’implémentation : `palantint/campus/page.tsx`, `CampusMap.tsx`, `CampusPanel.tsx`, `MapControls.tsx` et `reliefLayer.ts` sous ce groupe de routes.

## Stabilité du panneau

Règles établies après des régressions : elles priment sur toute nouvelle fonction du panneau.

1. **Ordre fixe** : en-tête compact, puis ce qui décrit la sélection (fiche, occupants, informations, agenda), puis la rangée d’actions, puis tout ce que les actions produisent (résultats, formulaires, listes de personnes). Une nouvelle section trouve sa place dans cet ordre ; elle ne s’insère pas au-dessus de la rangée d’actions.
2. **Rien ne bouge au-dessus du point d’interaction** : un résultat, un formulaire, une erreur ou un chargement apparaît sous la commande qui l’a demandé. Un chargement de contenu déjà affiché se signale dans l’en-tête, pas par une ligne qui apparaît puis disparaît dans le corps.
3. **Une seule rangée d’actions**, jamais repliée : elle défile horizontalement, avec des boutons de bord lorsqu’il reste des actions hors de vue. Libellés de deux ou trois mots. Les actions propres au type de lieu viennent d’abord ; Vue immersive, Signet et Copier le lien terminent toujours la rangée.
4. **Un résultat à la fois**, lié au lieu qui l’a demandé : il disparaît en changeant de lieu, une seconde pression sur l’action le masque, l’action active est marquée (`aria-pressed`, contour `campus`).
5. **Ce qui reste dessiné sur la carte s’efface toujours au même endroit** : bandeau en bas du panneau, ou Échap sans sélection.
6. **Hauteurs bornées** : listes longues et agenda défilent dans leur propre zone, pour que le panneau reste parcourable.
7. **Petit écran** : la feuille réduite ne montre que l’en-tête ; une commande ajoutée doit rester accessible une fois la feuille agrandie, sans masquer la carte en position réduite.

## Rendu de la carte

1. **Ordre des couches** : les couches de contexte (OpenStreetMap, orthophoto) restent sous les couches du campus, quel que soit l’ordre d’arrivée des données ; l’ordre est rétabli à chaque changement de style. Les couches d’une source restent déclarées dans sa `Source` : ne pas les en sortir.
2. **Hauteurs en 3D** : tout ce qui appartient à un étage est dessiné à la hauteur de cet étage (niveau × 3,2 m au-dessus du sol du campus), sous-sols compris : avec les surfaces 3D, la scène et les extrusions sont relevées de deux étages, car MapLibre n’extrude pas sous son plan. Les points et liens (personnes, signets) sont dessinés par la couche 3D au milieu de leur étage, toujours visibles ; jamais sur le plan plat, sous le scan. Les noms de bâtiments sont placés sur le toit.
3. **Sol de référence** : le sol du scan est mesuré sur le scan lui-même (serveur, `scan_ground`) et placé au niveau 0, comme le relief IGN ; les hauteurs cliquées des repères de calibration ne servent qu’en dernier recours.
4. **Chargement** : la carte s’affiche avant les données ; chaque source optionnelle peut manquer sans bloquer les autres ; pas d’écran de chargement plein.

## Interactions et accessibilité

Une interface principalement visuelle reste utilisable sans deviner ses icônes.

- Chaque bouton à icône possède un nom accessible (`aria-label`) et une infobulle lorsque cela aide à comprendre son action.
- Exposer les états actifs avec `aria-pressed`, les menus avec `aria-expanded`, et conserver un focus clavier visible.
- Associer la couleur à un contour, une forme, une icône ou un libellé d’état ; la couleur seule ne suffit pas.
- Préserver des cibles tactiles utilisables, l’accès clavier, les commandes essentielles sur mobile et la lisibilité des contenus superposés.
- Favoriser les transitions courtes de couleur et de bordure. Les mouvements et effets lumineux doivent rester discrets et utiles.

## Vérification avant livraison

Pour une modification visuelle, contrôler la cohérence avec la navbar et une page du même module, la palette sémantique, les états de survol/focus/sélection, ainsi que l’usage sur petit écran. Pour les cartes, vérifier la recherche, le panneau latéral et la sortie de sélection, le rail d’étages, les trois vues et la présence de la photogrammétrie en 3D.

Une modification de la carte n’est terminée qu’une fois vue dans un navigateur : Plan, Satellite et 3D ; un bâtiment avec plusieurs étages, dont un sous-sol ; la fiche d’un logement et d’une salle, avec une action qui affiche un résultat ; la feuille mobile réduite et agrandie ; aucune erreur dans la console. Les tests et le typage ne suffisent pas.

Les choix explicites ci-dessus ne doivent pas être remplacés par les valeurs par défaut d’une bibliothèque de composants. Toute nouvelle convention approuvée par l’utilisateur doit être consignée ici pour les modifications suivantes.
