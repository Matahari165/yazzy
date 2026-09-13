# Système de Design Yazzy — Identité « Céramique »

> **Source de vérité unique et absolue** pour toute l'interface utilisateur de Yazzy (Web, Mobile iPhone `390 × 844`, Mac `1440 × 900`).  
> Toute nouvelle page, composant, modale ou widget créé dans l'application doit respecter **strictement et intégralement** les spécifications de ce document.

---

## 1. Philosophie & Esprit de la Marque

L'identité **Céramique** de Yazzy puise son inspiration dans l'atelier de poterie d'art et le design scandinave contemporain :
- **100% Mode Clair** : univers diurne, chaleureux, lumineux, inspiré du grès calcaire, de l'argile cuite, du céladon et du biscuit de céramique.
- **Formes douces, organiques et asymétriques** : l'interface rejette catégoriquement le brutalisme dur, les angles à 0px, les bordures noires épaisses et les dégradés artificiels (*AI slop*). Les boutons et conteneurs adoptent la douceur tactile de **galets polis à la main** et de **coupelles creusées**.
- **Minimalisme radical & pureté** : chaque élément affiché est là parce qu'il a une fonction. Tout ce qui n'est pas indispensable à l'action immédiate ou à la lisibilité du jeu est proscrit.
- **Tactilité physique** : sensation d'objets réels que l'on manipule (ombres modelées, retours haptiques au clic, cliquetis de résine/céramique acoustique).

---

## 2. Règle d'Or de la Microcopy : Le Minimalisme Pur (*Distill*)

L'application élimine sans exception tout bavardage, sous-titre redondant ou fioriture textuelle.

### 🚫 Éléments formellement INTERDITS
1. **Sous-titres évidents** :
   - ❌ « Jouer contre une IA » / « Contre un bot »
   - ❌ « Inviter un ami » / « Partie locale à 2 » / « Avec un ami »
   - ❌ « Culture générale & Yatzy » / « Testez vos connaissances »
   - ❌ « Ambiance sonore du boss » / « Choisissez votre ambiance »
2. **Verbes d'action superflus sur boutons évidents** :
   - ❌ « Jouer en solo », « Lancer le mode duo », « Commencer la partie »
3. **Mots décoratifs vides** :
   - ❌ Bandeau défilant (*ticker*), filigrane de fond « Jouer », citations, slogans.
4. **Phrases de politesse et confirmations bavardes** :
   - ❌ « Bienvenue sur Yazzy ! Choisissez votre mode ci-dessous pour démarrer. »
   - ❌ « Êtes-vous sûr de vouloir quitter la partie en cours ? »

### ✅ Vocabulaire Autorisé & Précis
- **Actions principales (1 mot)** : `Solo`, `Duo`, `Quiz`, `Lancer`, `Inscrire`, `Relancer`.
- **Statuts & réglages** : `Mode Boss`, `Score`, `Tour [X]/15`, `Total`.
- **Formulaires** :
  - Un label direct : `Pseudo`, `Code de partie`.
  - Un placeholder réaliste : `Alex`, `ABC123`.
  - Bouton d'action direct : `Créer`, `Coller`, `Rejoindre`.
  - Message d'erreur : factuel et court (ex. *« 6 caractères requis. »*, *« Pseudo trop court. »*).

---

## 3. Typographie

Deux familles de polices Google Fonts définissent l'harmonie Céramique :

| Rôle | Police | Variable CSS | Caractère |
| :--- | :--- | :--- | :--- |
| **Titres & Identité** | **Bricolage Grotesque** | `--font-bricolage` | Rondeur organique, modelée à la main, expressive sans agressivité |
| **Corps, Boutons & Chiffres** | **Plus Jakarta Sans** | `--font-jakarta` | Lisibilité géométrique douce, moderne, chiffres tabulaires parfaits |

### Échelle Typographique & Usages

```css
/* Titre principal (Logo Hero) */
font-family: var(--font-bricolage), "Bricolage Grotesque", sans-serif;
font-size: clamp(40px, 6vw, 48px);
font-weight: 800;
letter-spacing: -0.04em;
line-height: 1;
color: var(--ink); /* #2B231E */

/* Titres de sections & Modales */
font-family: var(--font-bricolage), "Bricolage Grotesque", sans-serif;
font-size: 24px;
font-weight: 700;
letter-spacing: -0.02em;

/* Bouton d'action principal (ex: Solo) */
font-family: var(--font-jakarta), "Plus Jakarta Sans", sans-serif;
font-size: 22px;
font-weight: 700;
letter-spacing: -0.01em;

/* Boutons secondaires (ex: Duo, Quiz) */
font-family: var(--font-jakarta), "Plus Jakarta Sans", sans-serif;
font-size: 18px;
font-weight: 700;

/* Corps de texte, réglages, labels */
font-family: var(--font-jakarta), "Plus Jakarta Sans", sans-serif;
font-size: 14px;
font-weight: 600;

/* Nombres de score & probabilités (toujours tabulaires) */
font-family: var(--font-jakarta), "Plus Jakarta Sans", sans-serif;
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
font-weight: 700;
```

---

## 4. Palette Chromatique — Mode Clair « Céramique »

La palette s'articule autour des teintes naturelles d'argile, de céladon, de terre cuite et de biscuit émaillé. Tous les contrastes respectent les seuils WCAG AA (texte courant > 4.5:1, titres > 3:1).

```css
:root,
[data-theme="ceramic"],
html[data-theme="ceramic"] {
  color-scheme: light;

  /* --- Fonds & Surfaces --- */
  --page: #f3efea;               /* Fond d'écran global : grès calcaire mat */
  --surface: #faf8f5;            /* Surface des cartes & panneaux : biscuit émaillé */
  --surface-muted: #e8dfd3;      /* Surface secondaire douce */
  --dice-zone-surface: #ede4d8;  /* Alvéole / Coupelle des dés : argile chamottée */

  /* --- Typographie & Encres --- */
  --ink: #2b231e;                /* Encre principale : brun moka profond (contraste 11.8:1) */
  --ink-soft: #6b6055;           /* Encre secondaire : terre d'ombre douce (contraste 5.2:1) */

  /* --- Filets & Lignes --- */
  --line: #dfd4c5;               /* Bordure douce de potier (1.5px à 2px) */
  --line-strong: #c4b4a0;        /* Bordure délimitée */
  --board-border: #dfd4c5;       /* Contour de la feuille de score */

  /* --- Accents Métiers (Les 3 Terres) --- */
  --coral: #c85a32;              /* Terre cuite / Terracotta : Solo & Action dominante */
  --coral-deep: #aa4622;         /* Terracotta sombre au press/hover */
  --coral-soft: #faede6;         /* Voile terracotta clair */

  --player: #3d5a80;             /* Ardoise Céladon : Duo & Joueur Local */
  --player-soft: #edf2f7;        /* Voile ardoise doux */

  --green: #4a8072;              /* Sauge Céladon : Quiz & Dés gardés */
  --green-ink: #2e594e;          /* Texte vert accessible */
  --green-soft: #edf5f2;         /* Voile céladon clair */

  /* --- Alertes & Système --- */
  --danger: #c84832;             /* Rouge brique : erreurs de formulaire */
  --focus: #c85a32;              /* Anneau de focus accessible */
  --opponent: #9c413d;           /* Terre de Sienne : Adversaire */

  /* --- Dés Céramiques --- */
  --die-face-surface: #faf8f5;   /* Porcelaine mate */
  --die-face-border: #d4c7b8;    /* Liseré chamotté */
  --die-pip: #2b231e;            /* Pips brun moka creusés */
}
```

---

## 5. Formes Géométriques & Galets Asymétriques

La signature Céramique repose sur des **formes en galets polis aux rayons asymétriques** (*squircle / pebble shapes*).

### Le Cluster de Galets (Actions)
1. **Grand Galet Solo (Terracotta)** :
   ```css
   border-radius: 36px 22px 36px 24px;
   background: #c85a32;
   color: #ffffff;
   min-height: 80px;
   width: 100%;
   box-shadow: 0 10px 26px rgb(200 90 50 / 28%);
   ```
2. **Galet Moyen Duo (Ardoise Céladon)** :
   ```css
   border-radius: 22px 34px 22px 34px;
   background: #3d5a80;
   color: #ffffff;
   min-height: 62px;
   width: 88%;
   align-self: flex-start; /* Asymétrie à gauche */
   box-shadow: 0 8px 20px rgb(61 90 128 / 24%);
   ```
3. **Galet Moyen Quiz (Sauge Céladon)** :
   ```css
   border-radius: 30px 20px 32px 20px;
   background: #4a8072;
   color: #ffffff;
   min-height: 58px;
   width: 90%;
   align-self: flex-end; /* Asymétrie à droite */
   box-shadow: 0 8px 20px rgb(74 128 114 / 24%);
   ```

### L'Alvéole des Dés (`.pebble-tray`)
La piste de lancer ressemble à une coupelle de potier creusée :
```css
background: #ede4d8;
border: 2px solid #dfd4c5;
border-radius: 36px 36px 26px 26px;
padding: 20px 14px;
box-shadow: inset 0 3px 10px rgb(43 35 30 / 6%);
```

### Dés Céramique
- **Format** : Carré adouci `48px × 48px` (mobile) ou `54px × 54px` (desktop).
- **Radius** : `20px` (aspect galet cubique roulé dans la main).
- **Pips** : Points en brun moka `#2B231E`.
- **État sélectionné / gardé** : Contour vert sauge `#4A8072` de 2px, fond `#EDF5F2`, translation verticale de `-4px`.

---

## 6. Espacements & Rythme Vertical (Respiration Majeure)

Le design Céramique respire. Une aération franche évite toute impression d'étouffement.

### Règle d'or de la marge des dés
> **Une marge verticale d'au moins 36px à 44px sépare TOUJOURS l'alvéole des dés du premier bouton d'action.**

```css
/* Exemple dans layout-pebble */
.pebble-tray {
  margin-bottom: 40px; /* Espace respiratoire obligatoire */
}
```

### Grille d'Espacements Standard
- **4px (`--space-3xs`)** : Micro-espacement entre pastille et texte.
- **8px (`--space-2xs`)** : Espacement interne des badges et petits champs.
- **12px–14px (`--space-xs`)** : Écart vertical entre les boutons du cluster.
- **18px–20px (`--space-sm`)** : Padding interne des cartes et alvéoles.
- **24px–32px (`--space-md`)** : Écart entre conteneurs majeurs.
- **36px–44px (`--space-lg`)** : Respiration entre les dés et les actions.

### Zones de Sécurité Mobile (iPhone 390 × 844)
```css
padding-top: max(64px, calc(env(safe-area-inset-top) + 20px));
padding-bottom: max(32px, calc(env(safe-area-inset-bottom) + 16px));
padding-left: max(16px, env(safe-area-inset-left));
padding-right: max(16px, env(safe-area-inset-right));
```

---

## 7. Reliefs, Ombres & Micro-Interactions

### Ombres Modelées (Jamais de noir dur)
Toutes les ombres utilisent la teinte d'encre organique chaude `rgb(43 35 30)` avec faible opacité :
```css
/* Ombre diffuse de carte */
box-shadow: 0 6px 20px rgb(43 35 30 / 6%);

/* Ombre feutrée interne (coupelle) */
box-shadow: inset 0 3px 10px rgb(43 35 30 / 6%);

/* Ombre portée colorée pour bouton actif */
box-shadow: 0 10px 26px rgb(200 90 50 / 28%);
```

### Micro-Interactions au Toucher
- **Boutons galets** :
  ```css
  transition: transform 0.16s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.16s ease;
  &:active {
    transform: scale(0.96);
    box-shadow: 0 4px 12px rgb(43 35 30 / 12%);
  }
  ```
- **Dés** :
  ```css
  &:active {
    transform: scale(0.92) rotate(-2deg);
  }
  ```
- **Accessibilité Focus** :
  ```css
  &:focus-visible {
    outline: 2px solid var(--coral);
    outline-offset: 3px;
  }
  ```

---

## 8. Signature Acoustique & Haptique

Tout événement tactile est soutenu par la synthèse audio Web Audio API :
- **Choc de dés (`diceClack`)** : onde sinusoïdale modulée de 1350Hz à 1900Hz avec décroissance exponentielle rapide (32ms), simulant l'impact de dés en résine ou porcelaine.
- **Impact matière (`materialClick`)** : claquement feutré boisé synchrone.
- **Lancer complet** : nappe de frottement passe-bande à 420Hz sur 300ms + cascade de 6 cliquetis échelonnés.
- **Interaction immédiate** : toucher un dé sur l'écran déclenche instantanément son cliquetis physique individuel.

---

## 9. Guide d'Implémentation pour les Futurs Écrans

Lors du développement d'un nouvel écran (Partie, Feuille de score, Multi, Quiz, Historique) :

1. **Vérifier le mode clair** : Pas de fond noir, pas de mode nuit forcé. Le fond est toujours `#F3EFEA`.
2. **Adopter les galets** : Utiliser des rayons asymétriques doux (`20px` à `36px`) pour les cartes et actions.
3. **Tester la hauteur de touche** : Toute cible tactile doit faire **au moins 44 × 44 px** (idéalement 58px à 80px pour les actions du pouce).
4. **Purge du texte** : Relire l'écran et supprimer chaque mot qui n'est ni une donnée de jeu, ni un libellé d'action évident.
5. **Préserver la marge des dés** : 36px à 44px de vide entre la zone de lancer et les boutons d'action.
6. **Chiffres tabulaires** : Appliquer systématiquement `font-variant-numeric: tabular-nums` à tous les scores, pourcentages et compteurs de tours.
7. **Accessibilité complète** : Tous les boutons sans texte visible (ex: icône dé) doivent posséder un `aria-label` descriptif complet en français.
