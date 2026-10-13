-- FITNESS AI PRO studio administration schema
-- Applied to Supabase project qnouktkkbrwcdzgaqthi on 2026-10-13.
-- This file is the reproducible schema reference; review policies before reapplying.

create table if not exists public.fitness_studios (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  city text not null default '',
  address text not null default '',
  description text not null default '',
  phone text not null default '',
  website text not null default '',
  opening_hours text not null default '',
  is_published boolean not null default false,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fitness_studios_name_length check (char_length(name) <= 120),
  constraint fitness_studios_city_length check (char_length(city) <= 100),
  constraint fitness_studios_description_length check (char_length(description) <= 2000),
  constraint fitness_studios_opening_hours_length check (char_length(opening_hours) <= 1200)
);

create table if not exists public.studio_admins (
  studio_id uuid not null references public.fitness_studios(id) on delete cascade,
  email text not null,
  role text not null default 'manager' check (role in ('manager')),
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  primary key (studio_id, email),
  constraint studio_admins_email_lowercase check (email = lower(btrim(email)) and position('@' in email) > 1)
);

create table if not exists public.studio_offers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.fitness_studios(id) on delete cascade,
  title text not null,
  description text not null default '',
  price_label text not null default '',
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_offers_title_length check (char_length(title) between 1 and 120),
  constraint studio_offers_description_length check (char_length(description) <= 1200),
  constraint studio_offers_price_length check (char_length(price_label) <= 100),
  constraint studio_offers_dates check (valid_from is null or valid_until is null or valid_until >= valid_from)
);

create index if not exists studio_admins_email_idx on public.studio_admins (lower(email));
create index if not exists studio_offers_studio_active_idx on public.studio_offers (studio_id, is_active, valid_until);

create or replace function public.is_studio_manager(p_studio_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and exists (
    select 1 from public.studio_admins sa
    where sa.studio_id = p_studio_id
      and lower(sa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$function$;

alter table public.fitness_studios enable row level security;
alter table public.studio_admins enable row level security;
alter table public.studio_offers enable row level security;

grant select on public.fitness_studios, public.studio_offers to anon;
grant select, insert, update, delete on public.fitness_studios, public.studio_admins, public.studio_offers to authenticated;
revoke all on table public.studio_admins from anon;
revoke insert, update, delete on table public.fitness_studios from anon;
revoke insert, update, delete on table public.studio_offers from anon;

create policy "Public can view published studios" on public.fitness_studios
for select to anon, authenticated using (is_published = true);
create policy "Managers and app admins can view studios" on public.fitness_studios
for select to authenticated using (public.is_app_admin() or public.is_studio_manager(id));
create policy "App admins can create studios" on public.fitness_studios
for insert to authenticated with check (public.is_app_admin());
create policy "Managers can update assigned studios" on public.fitness_studios
for update to authenticated using (public.is_app_admin() or public.is_studio_manager(id))
with check (public.is_app_admin() or public.is_studio_manager(id));
create policy "App admins can delete studios" on public.fitness_studios
for delete to authenticated using (public.is_app_admin());

create policy "Users can view own studio assignment" on public.studio_admins
for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_app_admin());
create policy "App admins can insert studio assignments" on public.studio_admins
for insert to authenticated with check (public.is_app_admin());
create policy "App admins can update studio assignments" on public.studio_admins
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "App admins can delete studio assignments" on public.studio_admins
for delete to authenticated using (public.is_app_admin());

create policy "Public can view active offers for published studios" on public.studio_offers
for select to anon, authenticated using (
  is_active = true
  and (valid_from is null or valid_from <= current_date)
  and (valid_until is null or valid_until >= current_date)
  and exists (select 1 from public.fitness_studios s where s.id = studio_id and s.is_published = true)
);
create policy "Studio managers can view assigned offers" on public.studio_offers
for select to authenticated using (public.is_app_admin() or public.is_studio_manager(studio_id));
create policy "Studio managers can insert offers" on public.studio_offers
for insert to authenticated with check (public.is_app_admin() or public.is_studio_manager(studio_id));
create policy "Studio managers can update offers" on public.studio_offers
for update to authenticated using (public.is_app_admin() or public.is_studio_manager(studio_id))
with check (public.is_app_admin() or public.is_studio_manager(studio_id));
create policy "Studio managers can delete offers" on public.studio_offers
for delete to authenticated using (public.is_app_admin() or public.is_studio_manager(studio_id));

create or replace function public.prevent_studio_self_publish()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if new.is_published is distinct from old.is_published and not public.is_app_admin() then
    raise exception 'Only a platform administrator can publish or unpublish a studio';
  end if;
  return new;
end;
$function$;

create trigger prevent_studio_self_publish_trigger
before update on public.fitness_studios
for each row execute function public.prevent_studio_self_publish();

revoke execute on function public.is_studio_manager(uuid) from public, anon;
grant execute on function public.is_studio_manager(uuid) to authenticated;
revoke execute on function public.prevent_studio_self_publish() from public, anon, authenticated;
