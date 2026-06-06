-- Fix profile provisioning, MVP write access and interface locale.
alter table public.profiles
  add column if not exists locale text not null default 'ru'
  check (locale in ('ru', 'en'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Участник'),
    'member',
    case when new.raw_user_meta_data->>'locale' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  result public.profiles;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email into auth_email from auth.users where id = auth.uid();
  insert into public.profiles (id, email, full_name, role, locale)
  values (
    auth.uid(),
    coalesce(auth_email, ''),
    coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name', ''), split_part(coalesce(auth_email, ''), '@', 1), 'Участник'),
    'member',
    case when auth.jwt()->'user_metadata'->>'locale' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;

  select * into result from public.profiles where id = auth.uid();
  return result;
end; $$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- Self-insert is a fallback for installations where the auth trigger was absent.
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert to authenticated
with check (id = auth.uid() and role = 'member');

-- Members are regular invited workspace users and need the MVP write surfaces.
drop policy if exists promo_write on public.promo_materials;
create policy promo_write on public.promo_materials
for all to authenticated
using (public.current_role() in ('admin','member','manager','pr'))
with check (public.current_role() in ('admin','member','manager','pr'));

drop policy if exists contacts_access on public.contacts;
create policy contacts_access on public.contacts
for all to authenticated
using (public.current_role() in ('admin','member','manager'))
with check (public.current_role() in ('admin','member','manager'));

drop policy if exists finance_access on public.finance_records;
create policy finance_access on public.finance_records
for all to authenticated
using (public.current_role() in ('admin','member','manager'))
with check (public.current_role() in ('admin','member','manager'));

-- Admin remains unrestricted even if policies are changed later.
drop policy if exists rehearsals_admin_all on public.rehearsals;
create policy rehearsals_admin_all on public.rehearsals
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- Repair profiles for Auth users created before the trigger existed.
insert into public.profiles (id, email, full_name, role, locale)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(nullif(users.raw_user_meta_data->>'full_name', ''), split_part(coalesce(users.email, ''), '@', 1), 'Участник'),
  'member',
  'ru'
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where profiles.id is null;
