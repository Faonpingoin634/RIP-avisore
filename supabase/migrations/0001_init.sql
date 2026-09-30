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
