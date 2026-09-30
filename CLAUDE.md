# 🪦 RIP-Advisor — Spécification pour Claude Code

> **Le TripAdvisor de l'Au-delà.** Une carte mondiale des vrais cimetières (OpenStreetMap) sur laquelle les utilisateurs connectés laissent des avis sur le voisinage, l'ambiance et le taux d'humidité des caveaux.

Ce fichier est la source de vérité du projet. Suis-le à la lettre. Si une instruction est ambiguë ou semble impossible, **arrête-toi et pose la question** plutôt que d'improviser.

---

## 0. Travailler avec l'utilisateur

- L'utilisateur **ne code pas** : il pilote le projet uniquement à travers toi. Tu écris et vérifies tout le code toi-même.
- Quand une action manuelle est indispensable (tableau de bord Supabase, Vercel, création de compte, copie d'une clé), donne des **instructions pas à pas, clic par clic**, dis exactement quoi copier et où, puis **attends sa confirmation** avant de continuer.
- Ne lui demande jamais de coller une clé secrète (`service_role`) dans la conversation : il la place lui-même dans `.env.local` et dans Vercel.
- À la fin de chaque phase, résume en 3 lignes ce qui marche, et donne-lui un **test manuel à faire dans le navigateur**.
- Réponds en français.

## 1. Contexte et objectif

- Projet évalué, rendu en décembre. Le critère principal est un **CRUD complet et sécurisé côté serveur** sur l'entité **Avis (Review)**.
- Livrables : application **déployée sur Vercel** + dépôt git qui **démarre sans accroc sur une machine vierge** en suivant le README.
- Principe directeur : **aucune fonctionnalité à moitié faite**. Mieux vaut moins de fonctionnalités, toutes finies, que des boutons morts.

## 2. Périmètre

### Dans le périmètre (VML)
1. **Carte mondiale interactive** (page d'accueil) : cimetières OSM chargés à la volée selon la zone affichée, recherche de lieu, bouton « Me localiser ».
2. **Authentification** : inscription (pseudo, email, mot de passe), connexion, déconnexion via Supabase Auth.
3. **Fiche cimetière** : nom, infos OSM, note moyenne, nombre d'avis, liste des avis publics.
4. **CRUD des avis** : créer, lire, modifier, supprimer ses propres avis. **Un seul avis par utilisateur et par cimetière.**
5. **Page « Mes contributions »** : avis de l'utilisateur connecté, avec accès à la modification/suppression.
6. **Déploiement Vercel** fonctionnel.

### Hors périmètre — NE PAS implémenter
- Recherche de concession, réservation, paiement, prix.
- Upload de photos.
- Import massif/pré-chargement des cimetières du monde entier.
- Autocomplétion de la recherche de lieu (interdite par la politique d'usage de Nominatim).
- OAuth (Google, GitHub…), réinitialisation de mot de passe, modération, likes, réponses aux avis.
- Toute fonctionnalité non listée. Si une idée semble utile, propose-la au lieu de la coder (voir §13).

## 3. Stack technique

| Rôle | Choix |
|---|---|
| Framework | Next.js (dernière version stable), **App Router**, **TypeScript strict** |
| BDD + Auth | Supabase hébergé (PostgreSQL + Auth), client via `@supabase/ssr` |
| Carte | Leaflet + `react-leaflet` + regroupement de marqueurs (`react-leaflet-cluster` ou équivalent) — vérifier la compatibilité avec la version de React installée |
| Données cimetières | API **Overpass** (OpenStreetMap), appelée **uniquement côté serveur** |
| Recherche de lieu | API **Nominatim** (OpenStreetMap), appelée **uniquement côté serveur** |
| Validation | `zod` (schémas partagés client/serveur) |
| Style | Tailwind CSS |
| Tests | Vitest |
| Hébergement | Vercel |

Conventions :
- **Code, identifiants, noms de fichiers en anglais. Interface utilisateur 100 % en français.**
- Mutations via **Server Actions**. Route Handlers (`app/api/...`) uniquement pour les proxys Overpass/Nominatim.
- Pas de `any`. Pas de dépendance ajoutée sans justification dans le message de commit.
- Node.js **20 ou supérieur**.

## 4. Arborescence cible

```
rip-advisor/
├── CLAUDE.md
├── README.md
├── .env.example
├── app/
│   ├── layout.tsx                          # header (logo, liens, état de connexion), footer
│   ├── page.tsx                            # carte d'accueil
│   ├── connexion/page.tsx
│   ├── inscription/page.tsx
│   ├── mes-contributions/page.tsx          # protégée
│   ├── cimetieres/[osmType]/[osmId]/page.tsx  # fiche + avis + formulaire
│   ├── avis/[id]/modifier/page.tsx         # protégée, propriétaire uniquement
│   ├── actions/
│   │   ├── auth.ts
│   │   └── reviews.ts
│   └── api/
│       ├── cemeteries/route.ts             # GET ?cell=… → cimetières d'une cellule
│       ├── cemeteries/reviewed/route.ts    # GET → cimetières ayant au moins un avis
│       └── geocode/route.ts                # GET ?q=… → proxy Nominatim
├── components/
│   ├── map/CemeteryMap.tsx                 # 'use client', Leaflet
│   ├── map/MapLoader.tsx                   # 'use client', dynamic import ssr:false
│   ├── map/PlaceSearch.tsx
│   ├── reviews/ReviewForm.tsx
│   ├── reviews/ReviewList.tsx
│   ├── reviews/DeleteReviewButton.tsx
│   └── ui/…                                # SkullRating, DropRating, VibeTag…
├── lib/
│   ├── supabase/server.ts                  # client serveur (cookies, clé anon)
│   ├── supabase/client.ts                  # client navigateur (clé anon)
│   ├── supabase/admin.ts                   # clé service_role, `import 'server-only'`
│   ├── osm/overpass.ts                     # requêtes Overpass, endpoints de secours, parsing
│   ├── osm/cells.ts                        # découpage en cellules
│   ├── validation/review.ts                # schéma zod
│   ├── vibes.ts                            # liste des tags d'ambiance + libellés
│   └── types.ts
├── middleware.ts                           # rafraîchissement de session Supabase
├── supabase/migrations/0001_init.sql
└── tests/
    ├── review-validation.test.ts
    ├── cells.test.ts
    └── overpass-parse.test.ts
```

## 5. Données des cimetières (OpenStreetMap, monde entier)

Il existe des centaines de milliers de cimetières dans OSM : **on ne pré-importe rien**. Overpass est la source de vérité pour la carte ; Supabase ne stocke que les cimetières qui ont été **consultés** (fiche ouverte), pour pouvoir y rattacher des avis.

### 5.1 Chargement de la carte par cellules
- Le monde est découpé en **cellules de 0,1° × 0,1°**. Identifiant : `"{floor(lat*10)}_{floor(lon*10)}"` (ex. `488_23`). Logique dans `lib/osm/cells.ts`, testée.
- Au zoom **≥ 12**, le client calcule les cellules visibles (**16 maximum**, sinon on considère qu'on est trop dézoomé) et appelle `GET /api/cemeteries?cell=…` pour chacune qu'il n'a pas déjà en mémoire. Appels déclenchés sur `moveend`, avec un **debounce de 400 ms**.
- Au zoom **< 12** : afficher uniquement les cimetières **déjà notés** (`/api/cemeteries/reviewed`, 500 max, triés par nombre d'avis) et un bandeau « Zoomez pour voir tous les cimetières ».
- Dédoublonner côté client par clé `osmType/osmId` (un grand cimetière peut apparaître dans plusieurs cellules).
- Marqueurs regroupés (clusters) pour les zones denses.

### 5.2 Route `GET /api/cemeteries?cell=…`
1. Valider le paramètre (regex + bornes), sinon 400.
2. Calculer la bbox `(sud, ouest, nord, est)` de la cellule et interroger Overpass en **GET** (`?data=…` encodé) :
   ```
   [out:json][timeout:25];
   (
     nwr["landuse"="cemetery"](S,W,N,E);
     nwr["amenity"="grave_yard"](S,W,N,E);
   );
   out center tags;
   ```
3. Mise en cache : `fetch(..., { next: { revalidate: 604800 } })` (7 jours) + en-tête de réponse `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
4. Endpoints de secours, essayés dans l'ordre sur erreur 429/5xx/timeout (20 s via `AbortSignal.timeout`) : `https://overpass-api.de/api/interpreter`, puis `https://overpass.private.coffee/api/interpreter`, puis `https://overpass.kumi.systems/api/interpreter`.
5. Parsing (`lib/osm/overpass.ts`, testé) : `osmType`, `osmId`, `name` (`tags.name` sinon `null`), `lat`/`lon` (du nœud, ou `center`), quelques tags utiles (`religion`, `operator`, `wikipedia`, `website`).
6. Enrichir avec les notes : une requête Supabase sur `cemeteries` + `cemetery_ratings` filtrée sur les `osm_id` de la cellule.
7. Réponse : `{ cemeteries: [...], degraded: boolean }`. **Si tous les endpoints Overpass échouent**, renvoyer les cimetières de la cellule déjà présents en base avec `degraded: true` ; le client affiche un petit bandeau « Les données OpenStreetMap sont momentanément indisponibles ». Jamais d'écran d'erreur bloquant.

### 5.3 Fiche `/cimetieres/[osmType]/[osmId]`
1. Valider `osmType ∈ {node, way, relation}` et `osmId` entier positif, sinon `notFound()`.
2. Chercher en base par `(osm_type, osm_id)`.
3. Si absent : interroger Overpass pour cet élément précis (`way(123); out center tags;`), vérifier qu'il porte bien `landuse=cemetery` ou `amenity=grave_yard` (sinon `notFound()`), puis l'insérer avec le **client admin** (`upsert … on conflict (osm_type, osm_id) do nothing`). Les données insérées viennent **toujours d'Overpass, jamais du navigateur**.
4. Si Overpass est indisponible et que le cimetière n'est pas en base : page d'erreur aimable avec un bouton « Réessayer ».

### 5.4 Recherche de lieu (`/api/geocode?q=…`)
- Proxy vers `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=…`.
- En-tête `User-Agent: RIP-Advisor/1.0 (<NOMINATIM_CONTACT_EMAIL>)` obligatoire.
- Recherche **à la soumission du formulaire uniquement** (pas d'autocomplétion), requête de 2 à 100 caractères, cache 1 jour.
- Le client affiche jusqu'à 5 résultats ; un clic recentre la carte (zoom 14).

### 5.5 Attribution
La carte affiche « © contributeurs OpenStreetMap » (licence ODbL). Le footer et le README le mentionnent aussi.

## 6. Schéma de base de données

À écrire tel quel dans `supabase/migrations/0001_init.sql`. Ne pas modifier le schéma sans demander.

```sql
-- ============ PROFILES (pseudo public) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'fantome_' || left(new.id::text, 8))
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CEMETERIES (cache des cimetières consultés) ============
create table public.cemeteries (
  id uuid primary key default gen_random_uuid(),
  osm_type text not null check (osm_type in ('node', 'way', 'relation')),
  osm_id bigint not null check (osm_id > 0),
  name text,                                   -- null = « Cimetière sans nom »
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  tags jsonb not null default '{}'::jsonb,     -- religion, operator, wikipedia, website
  created_at timestamptz not null default now(),
  unique (osm_type, osm_id)
);

create index cemeteries_lat_lon_idx on public.cemeteries (latitude, longitude);

-- ============ REVIEWS ============
create type public.review_vibe as enum (
  'paisible', 'voisins_bruyants', 'gothique_chic', 'touristique', 'hante', 'abandonne'
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  cemetery_id uuid not null references public.cemeteries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),      -- crânes
  humidity smallint not null check (humidity between 1 and 5),  -- gouttes
  vibes public.review_vibe[] not null
    check (cardinality(vibes) between 1 and 3),                 -- 1 à 3 tags
  comment text not null check (char_length(btrim(comment)) between 10 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cemetery_id, user_id)   -- un seul avis par utilisateur et par cimetière
);

create index reviews_cemetery_id_idx on public.reviews (cemetery_id);
create index reviews_user_id_idx on public.reviews (user_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ============ NOTE MOYENNE ============
create view public.cemetery_ratings with (security_invoker = true) as
select
  c.id as cemetery_id,
  count(r.id)::int as review_count,
  round(avg(r.rating)::numeric, 1) as avg_rating,
  round(avg(r.humidity)::numeric, 1) as avg_humidity
from public.cemeteries c
left join public.reviews r on r.cemetery_id = c.id
group by c.id;

-- ============ RLS ============
alter table public.profiles   enable row level security;
alter table public.cemeteries enable row level security;
alter table public.reviews    enable row level security;

create policy "profiles lisibles par tous" on public.profiles
  for select using (true);

create policy "cimetieres lisibles par tous" on public.cemeteries
  for select using (true);
-- aucune policy d'écriture sur cemeteries : seul le client admin (serveur) écrit

create policy "avis lisibles par tous" on public.reviews
  for select using (true);

create policy "creer son avis" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "modifier son avis" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "supprimer son avis" on public.reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Empêche de déplacer un avis vers un autre cimetière ou un autre auteur
revoke update on public.reviews from authenticated;
grant update (rating, humidity, vibes, comment) on public.reviews to authenticated;
```

Libellés des tags d'ambiance (dans `lib/vibes.ts`) : paisible → « Paisible », voisins_bruyants → « Voisins bruyants », gothique_chic → « Gothique chic », touristique → « Touristique », hante → « Hanté », abandonne → « Abandonné ». Chaque tag a un emoji.

## 7. Sécurité et validation (point évalué)

Trois couches indépendantes ; aucune ne suffit seule :

1. **Zod côté serveur** (`lib/validation/review.ts`) dans chaque Server Action :
   - `rating` et `humidity` : `z.coerce.number().int().min(1).max(5)`.
   - `vibes` : tableau de 1 à 3 valeurs **distinctes** de l'enum.
   - `comment` : `trim()`, 10 à 2000 caractères.
   - `cemeteryId` / `reviewId` : UUID.
   Le même schéma sert au formulaire client, mais **la validation client n'est qu'un confort**.
2. **Identité vérifiée dans chaque action** : `supabase.auth.getUser()` (jamais `getSession()` pour décider d'un droit). Sans utilisateur → « Vous devez être connecté ». Le `user_id` inséré vient **toujours** de `getUser()`, jamais du formulaire.
3. **RLS + contraintes SQL** (§6) : dernier rempart.

Règles supplémentaires :
- Les Server Actions d'avis utilisent le **client serveur avec la session de l'utilisateur**, jamais le client admin (sinon la RLS est contournée).
- Le client admin (`lib/supabase/admin.ts`, `import 'server-only'`) sert **uniquement** à insérer des cimetières vérifiés via Overpass (§5.3).
- `SUPABASE_SERVICE_ROLE_KEY` n'a **jamais** le préfixe `NEXT_PUBLIC_`.
- Update/Delete : filtrer par `id` **et** `user_id`, vérifier qu'une ligne a bien été affectée, sinon « Avis introuvable ou non autorisé ».
- Unicité `(cemetery_id, user_id)` violée (code `23505`) → « Vous avez déjà donné votre avis sur ce cimetière » + lien vers la modification.
- Retour des actions : `{ ok: true } | { ok: false, error: string, fieldErrors?: Record<string, string[]> }`. Jamais de message brut de Postgres affiché.
- Après chaque mutation : `revalidatePath` de la fiche et de `/mes-contributions`.
- `/avis/[id]/modifier` renvoie `notFound()` si l'avis n'appartient pas à l'utilisateur connecté.
- Pages protégées : redirection vers `/connexion?next=…`. Le paramètre `next` n'accepte que des chemins internes commençant par `/` (pas `//`), pour éviter les redirections ouvertes.
- Aucun secret commité. Seul `.env.example` est versionné.

## 8. Détails fonctionnels

### Carte (`/`)
- Leaflet ne supporte pas le SSR : `CemeteryMap` est chargé via `next/dynamic` avec `ssr: false` **depuis un composant client** (`MapLoader`), avec un placeholder.
- Import de `leaflet/dist/leaflet.css`.
- Marqueurs `L.divIcon` avec l'emoji 🪦 (évite le bug des icônes par défaut). Les cimetières déjà notés ont un marqueur distinct (ex. badge avec la note).
- Centre initial : Paris (48.8566, 2.3522), zoom 13.
- « Me localiser » : `navigator.geolocation`, gère le refus et l'indisponibilité avec un message clair.
- Barre de recherche de lieu (§5.4) en haut de la carte.
- Popup d'un marqueur : nom (ou « Cimetière sans nom »), note moyenne et nombre d'avis s'il y en a, bouton « Voir la fiche ».
- Indicateur de chargement discret pendant les appels de cellules.

### Fiche
- En-tête : nom, infos issues des tags (religion, gestionnaire, lien Wikipédia/site web s'ils existent), coordonnées, lien « Voir sur la carte » (`/?lat=…&lon=…&z=16`, que la carte d'accueil sait lire), lien « Voir sur OpenStreetMap ».
- Note moyenne en crânes, humidité moyenne en gouttes, nombre d'avis.
- Avis du plus récent au plus ancien : pseudo, date, « (modifié) » si `updated_at > created_at`, crânes, gouttes, tags, commentaire.
- Non connecté : invitation à se connecter (avec retour sur la fiche après connexion).
- Connecté sans avis : formulaire de création.
- Connecté avec avis : son avis mis en avant avec « Modifier » et « Supprimer ».

### Suppression
Confirmation explicite avant suppression.

### Inscription
- Champs : pseudo, email, mot de passe (8 caractères min.). Pseudo passé dans `options.data.username` de `signUp`.
- Vérifier la disponibilité du pseudo avant `signUp` ; erreur claire si pris.
- Confirmation par email **désactivée** dans Supabase (documenté dans le README).

### États à gérer partout
Chargement, liste vide (« Aucun avis. Soyez le premier à troubler le silence. »), erreur réseau/serveur, formulaire en cours d'envoi (bouton désactivé), page 404 personnalisée (« Cette tombe est vide »).

### Design
- Thème sombre « gothique chic » mais **lisible** : contraste WCAG AA, texte ≥ 16 px.
- Responsive : carte plein écran sur mobile, fiche en une colonne.
- Accessibilité : labels sur tous les champs, notations crânes/gouttes en boutons radio stylés utilisables au clavier, tags en cases à cocher, `aria-label` sur les icônes.
- Metadata (titre, description) sur chaque page.

## 9. Variables d'environnement

`.env.example` :
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Secret, serveur uniquement. Ne jamais préfixer par NEXT_PUBLIC_ ni commiter.
SUPABASE_SERVICE_ROLE_KEY=
# Email de contact exigé par la politique d'usage de Nominatim
NOMINATIM_CONTACT_EMAIL=
```
(Si le tableau de bord Supabase affiche une « publishable key » et une « secret key », ce sont respectivement l'équivalent de l'anon key et de la service_role key.)

## 10. Ordre de travail

Phase par phase. **À la fin de chaque phase : `npm run lint`, `npx tsc --noEmit`, `npm test` et `npm run build` passent**, puis commit clair et test manuel proposé à l'utilisateur (§0). Ne passe pas à la phase suivante avec une erreur.

1. **Initialisation** : projet Next.js + TS + Tailwind + ESLint + Vitest, dépendances, `.env.example`, clients Supabase (server, client, admin), middleware, dépôt git.
2. **Supabase** : guider l'utilisateur pour créer le projet, exécuter la migration dans le SQL Editor, désactiver la confirmation email et remplir `.env.local`. Vérifier la connexion.
3. **Données OSM** : `lib/osm/*`, route `/api/cemeteries`, tests de parsing et de cellules.
4. **Carte** : affichage, cellules, clusters, recherche de lieu, géolocalisation, mode dégradé.
5. **Auth** : inscription, connexion, déconnexion, header dynamique, protection des routes.
6. **Fiche cimetière** : création paresseuse en base (§5.3), lecture des avis.
7. **CRUD avis** : création, modification, suppression, « Mes contributions », tous les cas du §7.
8. **Déploiement Vercel** (dès que la phase 7 marche, pas à la fin) : guider l'utilisateur pour importer le dépôt GitHub dans Vercel, ajouter les 4 variables d'environnement, puis dans Supabase → **Authentication → URL Configuration** : mettre l'URL Vercel en *Site URL* et ajouter `http://localhost:3000/**` et `https://<url-vercel>/**` aux *Redirect URLs*. Vérifier le parcours complet en production.
9. **Finitions** : états vides/chargement/erreur, responsive, accessibilité, 404, metadata.
10. **README.md** (§11), puis passage complet de la checklist (§12) **en local et en production**.

## 11. README.md à produire

En français, destiné au correcteur :
1. Présentation (pitch) + **lien vers l'application déployée** en tout premier.
2. Captures d'écran (carte, fiche, formulaire).
3. Stack.
4. Prérequis : Node.js 20+, un compte Supabase gratuit.
5. Installation locale pas à pas :
   1. `git clone <URL_DU_DEPOT>` puis `cd rip-advisor`
   2. `npm install`
   3. Créer un projet Supabase.
   4. **SQL Editor** : exécuter `supabase/migrations/0001_init.sql`.
   5. **Authentication → Sign In / Providers → Email** : désactiver « Confirm email ».
   6. Copier `.env.example` en `.env.local` et le remplir (**Project Settings → API** pour les clés).
   7. `npm run dev` puis ouvrir http://localhost:3000
6. Déploiement Vercel (variables d'environnement, URL Configuration Supabase).
7. Scripts (`dev`, `build`, `start`, `lint`, `test`).
8. Architecture : modèle de données, chargement des cimetières par cellules et cache, trois couches de sécurité.
9. Limites connues (dépendance aux serveurs publics Overpass/Nominatim, mode dégradé).
10. Scénario de test manuel (§12).
11. Crédits : données © contributeurs OpenStreetMap, licence ODbL ; géocodage Nominatim.

## 12. Définition de « terminé »

À valider en local **et** sur l'URL Vercel :
- [ ] `npm install && npm run build` fonctionne sur un clone propre.
- [ ] `npm run lint`, `npx tsc --noEmit` et `npm test` passent.
- [ ] La carte affiche des cimetières à Paris, et aussi dans une autre ville lointaine (ex. rechercher « Buenos Aires » puis zoomer).
- [ ] Dézoomé, seuls les cimetières notés s'affichent avec le bandeau « Zoomez ».
- [ ] Recherche de lieu et « Me localiser » fonctionnent (y compris refus de géolocalisation).
- [ ] Un clic sur un marqueur jamais consulté ouvre sa fiche et crée la ligne en base.
- [ ] Une URL de fiche avec un `osmId` qui n'est pas un cimetière renvoie la 404.
- [ ] Inscription → connexion → déconnexion ; le pseudo s'affiche ; pseudo déjà pris refusé proprement.
- [ ] Créer un avis ; il apparaît sur la fiche, dans « Mes contributions » et sur le marqueur ; les moyennes se mettent à jour.
- [ ] Un second avis sur le même cimetière est refusé avec un message clair.
- [ ] Modifier son avis ; « (modifié) » apparaît.
- [ ] Supprimer son avis après confirmation.
- [ ] Un utilisateur B ne peut ni modifier ni supprimer l'avis de A (via l'interface, via l'URL `/avis/[id]/modifier`, et en appelant l'action directement).
- [ ] Note 0 ou 6, humidité hors bornes, 0 ou 4 tags, tag inconnu, commentaire vide ou fait d'espaces : refusés **par le serveur**.
- [ ] Aucune erreur dans la console navigateur ni dans les logs Vercel sur le parcours complet.
- [ ] Aucun secret dans le dépôt (`git grep -i "service_role\|eyJ"` ne renvoie rien de sensible).
- [ ] Attribution OpenStreetMap visible.
- [ ] Aucun lien, bouton ou page qui ne mène nulle part.

## 13. Bonus (uniquement après §12 entièrement coché, et après accord de l'utilisateur)

- Tri des avis (récents / mieux notés).
- Page « Classement » : cimetières les mieux notés.
- Filtre de la carte par tag d'ambiance.
