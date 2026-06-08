-- Copy Library for internal promo, EPK, event, release and social texts.
--
-- This module is private to authenticated workspace users. It does not expose
-- public read policies.

create table if not exists public.copy_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'social_post'
    check (category in (
      'concert_announcement',
      'concert_reminder',
      'release_announcement',
      'song_description',
      'epk_bio',
      'press_release',
      'festival_pitch',
      'social_post',
      'ad_copy',
      'telegram_post',
      'vk_post',
      'email',
      'other'
    )),
  channel text
    check (channel is null or channel in (
      'vk',
      'telegram',
      'instagram',
      'youtube',
      'press',
      'email',
      'website',
      'ads',
      'internal',
      'other'
    )),
  language text not null default 'ru'
    check (language in ('ru', 'en')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'archived')),
  body text not null,
  notes text,
  event_id uuid references public.events(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  epk_id uuid references public.epk_profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copy_item_versions (
  id uuid primary key default gen_random_uuid(),
  copy_item_id uuid not null references public.copy_items(id) on delete cascade,
  body text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists copy_items_category_idx on public.copy_items(category);
create index if not exists copy_items_channel_idx on public.copy_items(channel);
create index if not exists copy_items_language_idx on public.copy_items(language);
create index if not exists copy_items_status_idx on public.copy_items(status);
create index if not exists copy_items_event_id_idx on public.copy_items(event_id);
create index if not exists copy_items_album_id_idx on public.copy_items(album_id);
create index if not exists copy_items_song_id_idx on public.copy_items(song_id);
create index if not exists copy_items_epk_id_idx on public.copy_items(epk_id);
create index if not exists copy_item_versions_copy_item_id_idx on public.copy_item_versions(copy_item_id);

drop trigger if exists set_copy_items_updated_at on public.copy_items;
create trigger set_copy_items_updated_at
before update on public.copy_items
for each row execute function public.set_updated_at();

alter table public.copy_items enable row level security;
alter table public.copy_item_versions enable row level security;

drop policy if exists copy_items_admin_all on public.copy_items;
create policy copy_items_admin_all on public.copy_items
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists copy_items_workspace_read on public.copy_items;
create policy copy_items_workspace_read on public.copy_items
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists copy_items_workspace_insert on public.copy_items;
create policy copy_items_workspace_insert on public.copy_items
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists copy_items_workspace_update on public.copy_items;
create policy copy_items_workspace_update on public.copy_items
for update to authenticated
using (public.current_role() in ('admin', 'manager', 'member'))
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists copy_items_workspace_delete on public.copy_items;
create policy copy_items_workspace_delete on public.copy_items
for delete to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists copy_item_versions_admin_all on public.copy_item_versions;
create policy copy_item_versions_admin_all on public.copy_item_versions
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists copy_item_versions_workspace_read on public.copy_item_versions;
create policy copy_item_versions_workspace_read on public.copy_item_versions
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists copy_item_versions_workspace_insert on public.copy_item_versions;
create policy copy_item_versions_workspace_insert on public.copy_item_versions
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));
