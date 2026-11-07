-- ====================================================================
-- EFA EDO - Schéma Supabase pour public.artisans, public.boost_requests & public.admins
-- Exécutez ce script dans l'Éditeur SQL (SQL Editor) de votre projet Supabase
-- ====================================================================

-- 1. Table des Artisans
create table if not exists public.artisans (
  id text primary key,
  name text not null,
  phone text,
  whatsapp text,
  trade text not null,
  custom_trade_name text,
  additional_trades text[],
  address_detail text,
  lat double precision default null,
  lng double precision default null,
  avatar text,
  cover_image text,
  work_photos text[],
  is_online boolean default true,
  is_pro boolean default false,
  is_boosted boolean default false,
  boost_until timestamptz,
  boost_level text,
  status text default 'approuve',
  rating numeric(3,1) default 5.0,
  review_count integer default 0,
  completed_jobs integer default 0,
  bio_voice_text text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Si la table existait déjà, ajouter les colonnes requises
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS is_boosted boolean default false;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS boost_until timestamptz;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS boost_level text;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS status text default 'approuve';

-- Activation de Row Level Security (RLS) sur artisans
alter table public.artisans enable row level security;

-- Politiques RLS artisans (lecture, insertion, mise à jour, suppression)
drop policy if exists "Lecture publique des artisans" on public.artisans;
create policy "Lecture publique des artisans"
  on public.artisans for select
  using (true);

drop policy if exists "Insertion publique d'artisans" on public.artisans;
create policy "Insertion publique d'artisans"
  on public.artisans for insert
  with check (true);

drop policy if exists "Mise à jour publique des artisans" on public.artisans;
create policy "Mise à jour publique des artisans"
  on public.artisans for update
  using (true);

drop policy if exists "Suppression admin des artisans" on public.artisans;
create policy "Suppression admin des artisans"
  on public.artisans for delete
  using (true);

-- 2. Table des demandes d'abonnement PRO (boost_requests)
CREATE TABLE IF NOT EXISTS public.boost_requests (
  id uuid primary key default gen_random_uuid(),
  artisan_id text references public.artisans(id) on delete cascade,
  duree int,
  montant int,
  statut text default 'en_attente',
  created_at timestamptz default now()
);

alter table public.boost_requests enable row level security;

drop policy if exists "Lecture publique boost_requests" on public.boost_requests;
create policy "Lecture publique boost_requests"
  on public.boost_requests for select
  using (true);

drop policy if exists "Insertion publique boost_requests" on public.boost_requests;
create policy "Insertion publique boost_requests"
  on public.boost_requests for insert
  with check (true);

drop policy if exists "Mise à jour boost_requests" on public.boost_requests;
create policy "Mise à jour boost_requests"
  on public.boost_requests for update
  using (true);

-- 3. Table des Administrateurs (admins)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  role text default 'super_admin'
);

alter table public.admins enable row level security;

drop policy if exists "Lecture publique admins" on public.admins;
create policy "Lecture publique admins"
  on public.admins for select
  using (true);

-- Insertion du Super Admin
INSERT INTO public.admins(email, role)
VALUES ('efatech2@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 4. Table des Avis Clients réels (reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid primary key default gen_random_uuid(),
  artisan_id text references public.artisans(id) on delete cascade,
  client_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Lecture publique reviews" on public.reviews;
create policy "Lecture publique reviews"
  on public.reviews for select
  using (true);

drop policy if exists "Insertion publique reviews" on public.reviews;
create policy "Insertion publique reviews"
  on public.reviews for insert
  with check (true);

drop policy if exists "Suppression admin reviews" on public.reviews;
create policy "Suppression admin reviews"
  on public.reviews for delete
  using (true);

