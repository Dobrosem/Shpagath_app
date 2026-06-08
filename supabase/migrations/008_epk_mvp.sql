-- EPK MVP for press kit profiles and public media links.
--
-- Create a Supabase Storage bucket named "epk-assets" manually.
-- For the MVP, workspace pages may use authenticated/signed URLs. Public EPK
-- pages should use public URLs or manually managed external URLs.

create table if not exists public.epk_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_bio text,
  full_bio text,
  genre text,
  location text,
  booking_email text,
  booking_phone text,
  website_url text,
  vk_url text,
  telegram_url text,
  youtube_url text,
  yandex_music_url text,
  spotify_url text,
  apple_music_url text,
  press_quote text,
  achievements text,
  tech_rider_url text,
  stage_plot_url text,
  logo_url text,
  hero_image_url text,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.epk_media_links (
  id uuid primary key default gen_random_uuid(),
  epk_id uuid not null references public.epk_profiles(id) on delete cascade,
  type text not null
    check (type in ('music', 'video', 'live_video', 'interview', 'press', 'document', 'photo_gallery', 'other')),
  title text not null,
  url text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists epk_profiles_slug_idx on public.epk_profiles(slug);
create index if not exists epk_profiles_is_public_idx on public.epk_profiles(is_public);
create index if not exists epk_media_links_epk_id_idx on public.epk_media_links(epk_id);
create index if not exists epk_media_links_type_idx on public.epk_media_links(type);

drop trigger if exists set_epk_profiles_updated_at on public.epk_profiles;
create trigger set_epk_profiles_updated_at
before update on public.epk_profiles
for each row execute function public.set_updated_at();

alter table public.epk_profiles enable row level security;
alter table public.epk_media_links enable row level security;

drop policy if exists epk_profiles_public_read on public.epk_profiles;
create policy epk_profiles_public_read on public.epk_profiles
for select to anon, authenticated
using (is_public = true);

drop policy if exists epk_profiles_workspace_read on public.epk_profiles;
create policy epk_profiles_workspace_read on public.epk_profiles
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_profiles_workspace_insert on public.epk_profiles;
create policy epk_profiles_workspace_insert on public.epk_profiles
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_profiles_workspace_update on public.epk_profiles;
create policy epk_profiles_workspace_update on public.epk_profiles
for update to authenticated
using (public.current_role() in ('admin', 'manager', 'member'))
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_profiles_workspace_delete on public.epk_profiles;
create policy epk_profiles_workspace_delete on public.epk_profiles
for delete to authenticated
using (public.current_role() in ('admin', 'manager'));

drop policy if exists epk_media_links_public_read on public.epk_media_links;
create policy epk_media_links_public_read on public.epk_media_links
for select to anon, authenticated
using (
  exists (
    select 1 from public.epk_profiles epk
    where epk.id = epk_id and epk.is_public = true
  )
);

drop policy if exists epk_media_links_workspace_read on public.epk_media_links;
create policy epk_media_links_workspace_read on public.epk_media_links
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_media_links_workspace_insert on public.epk_media_links;
create policy epk_media_links_workspace_insert on public.epk_media_links
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_media_links_workspace_update on public.epk_media_links;
create policy epk_media_links_workspace_update on public.epk_media_links
for update to authenticated
using (public.current_role() in ('admin', 'manager', 'member'))
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_media_links_workspace_delete on public.epk_media_links;
create policy epk_media_links_workspace_delete on public.epk_media_links
for delete to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists epk_assets_authenticated_read on storage.objects;
create policy epk_assets_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'epk-assets');

drop policy if exists epk_assets_authenticated_insert on storage.objects;
create policy epk_assets_authenticated_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'epk-assets'
  and public.current_role() in ('admin', 'manager', 'member')
);

drop policy if exists epk_assets_authenticated_update on storage.objects;
create policy epk_assets_authenticated_update on storage.objects
for update to authenticated
using (
  bucket_id = 'epk-assets'
  and public.current_role() in ('admin', 'manager', 'member')
)
with check (
  bucket_id = 'epk-assets'
  and public.current_role() in ('admin', 'manager', 'member')
);

drop policy if exists epk_assets_authenticated_delete on storage.objects;
create policy epk_assets_authenticated_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'epk-assets'
  and public.current_role() in ('admin', 'manager')
);
