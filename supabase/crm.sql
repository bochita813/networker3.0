-- NETWORKER 3.0 · CRM privado para leads
-- Ejecutar una sola vez desde Supabase > SQL Editor (proyecto propio).
create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.crm_admins enable row level security;
revoke all on public.crm_admins from anon, authenticated;
grant select on public.crm_admins to authenticated;
drop policy if exists "Ver mi permiso CRM" on public.crm_admins;
create policy "Ver mi permiso CRM" on public.crm_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (char_length(regexp_replace(phone,'[^0-9]','','g')) between 9 and 15),
  email text check (email is null or char_length(email) <= 180),
  source text not null default 'Landing' check (char_length(source) between 2 and 45),
  interest text not null default 'Explorando' check (char_length(interest) between 2 and 100),
  stage text not null default 'Nuevo' check (stage in
    ('Nuevo','Conversación','Interés confirmado','Presentación','Evaluación','Socio','Descartado')),
  priority text not null default 'Media' check (priority in ('Baja','Media','Alta')),
  note text not null default '' check (char_length(note) <= 5000),
  follow_up date,
  last_contact date,
  consent boolean not null default false
);
alter table public.crm_leads enable row level security;
create index if not exists crm_leads_stage_idx on public.crm_leads(stage);
create index if not exists crm_leads_followup_idx on public.crm_leads(follow_up);

-- Visitantes: solo alta voluntaria. No lectura, cambios ni borrado.
revoke all on public.crm_leads from anon, authenticated;
grant insert (name,phone,email,source,interest,note,consent) on public.crm_leads to anon;
grant select, insert, update, delete on public.crm_leads to authenticated;
drop policy if exists "Visitante crea lead" on public.crm_leads;
create policy "Visitante crea lead" on public.crm_leads
  for insert to anon with check (
    consent = true and source = 'Landing' and stage = 'Nuevo'
    and priority = 'Media' and follow_up is null and last_contact is null
    and char_length(note) <= 350
  );

-- Los contactos se leen y gestionan ÚNICAMENTE por usuarios autorizados.
drop policy if exists "Administrar CRM" on public.crm_leads;
create policy "Administrar CRM" on public.crm_leads
  for all to authenticated
  using (exists (select 1 from public.crm_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.crm_admins a where a.user_id = (select auth.uid())));

-- PASO FINAL DESPUÉS DE CREAR TU USUARIO EN Authentication > Users:
-- reemplazar TU-UUID-AQUI por el UID de ese usuario y ejecutar SOLO la siguiente línea:
-- insert into public.crm_admins(user_id) values ('TU-UUID-AQUI') on conflict do nothing;

-- Nota seguridad: el acceso público de inserción está limitado con RLS, pero requiere
-- CAPTCHA/rate limiting para soportar campañas de alto volumen y evitar spam.
