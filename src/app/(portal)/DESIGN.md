# Direction Artistique (DA) - INT Portal (Public Space)

## 🎨 Le Manifeste : Swiss-Bauhaus Moderne, Accessible & Vivant

Contrairement à l'esthétique cryptique et sombre de PalantINT, le **Portail Public de l'INT** est conçu pour être accueillant, ouvert et immédiatement accessible. Nous adoptons un style **Swiss-Minimalist Clean Tech** (inspiré du design de grille suisse et des principes de l'école du Bauhaus) adapté au web moderne.

L'interface doit inspirer la clarté, l'accessibilité et la fluidité pour toute la communauté étudiante et les visiteurs externes.

---

## ☀️ Palette & Thématique : Tons Chauds, Légèreté & Contrastes Doux

L'interface utilise des surfaces claires, texturées et chaleureuses, rehaussées de bordures de haute précision et de micro-ombres.

- **Le Fond (Lumière) :** `bg-gradient-to-br from-zinc-50 via-stone-50 to-orange-50/20`. Un ton sable/ivoire très doux qui fatigue moins les yeux que le blanc pur.
- **Les Conteneurs (Glassmorphism Clair) :** Des surfaces en verre clair (`bg-white/80 backdrop-blur-md border border-zinc-200/80 shadow-sm`).
- **Formes Arrondies (Approche Humaine) :** Contrairement à la rigidité des coins carrés de PalantINT, le portail public utilise des bords généreusement arrondis (`rounded-2xl` et `rounded-xl`) pour encourager le clic et l'exploration.
- **Accents de Couleur (Identité des Services) :**
  - **Machine à laver / Séchoir (Laverie) :** Bleu Ciel/Indigo frais (`text-blue-600 bg-blue-50`).
  - **Associations & Événements (Clubs) :** Rose/Corail chaleureux (`text-rose-600 bg-rose-50`).
  - **Campus & Logement (Appartements) :** Ambre/Orange doré (`text-amber-600 bg-amber-50`).
  - **Groupes de Classes (Cursus) :** Émeraude/Menthe dynamique (`text-emerald-600 bg-emerald-50`).

---

## 🔤 Typographie & Ergonomie

- **Titres (Display) :** `Space Grotesk` (sans-serif géométrique expressive et moderne) pour donner de la personnalité et un aspect innovant.
- **Corps de texte (Body) :** `Inter` ou `System Sans` pour une lisibilité maximale à tous les niveaux de zoom.
- **Boutons d'action (Primary CTA) :** Textes gras à fort contraste (`bg-zinc-900 text-white hover:bg-zinc-950 font-bold uppercase tracking-wider`).

---

## 📐 Expérience Interactive & Animations

- **Micro-Animations de Cartes (Hover Lift) :** Au survol, les cartes s'élèvent subtilement (`hover:-translate-y-1 hover:shadow-md transition-all duration-300`), et les icônes colorées s'agrandissent légèrement.
- **Champs de Formulaire Vivants :** Les champs de saisie (ex: Login, Recherche) s'illuminent doucement en changeant de couleur de bordure au focus (`focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all`).
- **Accessibilité :** Contraste de texte et cibles tactiles conformes aux recommandations d'accessibilité (WCAG 2.1 AA).
