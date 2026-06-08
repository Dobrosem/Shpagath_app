-- Content Calendar for internal publication planning.
--
-- This module links planned publications to Copy Library items and workspace
-- entities. It does not publish automatically and has no public read policy.

create table if not exists public.content_calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  channel text not null default 'vk'
    check (channel in ('vk', 'telegram', 'instagram', 'youtube', 'website', 'email', 'ads', 'press', 'internal', 'other')),
  content_type text not null default 'post'
    check (content_type in ('post', 'story', 'reels', 'shorts', 'video', 'announcement', 'reminder', 'press_release', 'ad', 'email', 'article', 'other')),
  status text not null default 'draft'
    check (status in ('idea', 'draft', 'ready', 'scheduled', 'published', 'cancelled', 'archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  copy_item_id uuid references public.copy_items(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  epk_id uuid references public.epk_profiles(id) on delete set null,
  asset_url text,
  result_url text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_calendar_items_channel_idx on public.content_calendar_items(channel);
create index if not exists content_calendar_items_content_type_idx on public.content_calendar_items(content_type);
create index if not exists content_calendar_items_status_idx on public.content_calendar_items(status);
create index if not exists content_calendar_items_scheduled_at_idx on public.content_calendar_items(scheduled_at);
create index if not exists content_calendar_items_copy_item_id_idx on public.content_calendar_items(copy_item_id);
create index if not exists content_calendar_items_event_id_idx on public.content_calendar_items(event_id);
create index if not exists content_calendar_items_album_id_idx on public.content_calendar_items(album_id);
create index if not exists content_calendar_items_song_id_idx on public.content_calendar_items(song_id);
create index if not exists content_calendar_items_epk_id_idx on public.content_calendar_items(epk_id);

drop trigger if exists set_content_calendar_items_updated_at on public.content_calendar_items;
create trigger set_content_calendar_items_updated_at
before update on public.content_calendar_items
for each row execute function public.set_updated_at();

alter table public.content_calendar_items enable row level security;

drop policy if exists content_calendar_items_admin_all on public.content_calendar_items;
create policy content_calendar_items_admin_all on public.content_calendar_items
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists content_calendar_items_workspace_read on public.content_calendar_items;
create policy content_calendar_items_workspace_read on public.content_calendar_items
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists content_calendar_items_workspace_insert on public.content_calendar_items;
create policy content_calendar_items_workspace_insert on public.content_calendar_items
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists content_calendar_items_workspace_update on public.content_calendar_items;
create policy content_calendar_items_workspace_update on public.content_calendar_items
for update to authenticated
using (public.current_role() in ('admin', 'manager', 'member'))
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists content_calendar_items_workspace_delete on public.content_calendar_items;
create policy content_calendar_items_workspace_delete on public.content_calendar_items
for delete to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));
