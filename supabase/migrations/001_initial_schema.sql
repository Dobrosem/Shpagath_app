-- Saphath Workspace: schema, indexes, audit and Row Level Security.
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','member','guest','session_musician','manager','pr');
create type public.access_level as enum ('read','write');
create type public.priority_level as enum ('low','normal','high','critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'guest',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('concert','release','song','video','merch','rehearsal','promo_campaign','orchestration','recording','mixing','mastering')),
  description text,
  status text not null default 'idea' check (status in ('idea','draft','in_progress','waiting','approved','done','archived')),
  priority public.priority_level not null default 'normal',
  deadline date,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  status text not null default 'idea' check (status in ('idea','demo','arrangement','recording','mixing','mastering','ready','live_ready','archived')),
  bpm integer check (bpm between 20 and 400),
  key text, tuning text, time_signature text, duration integer,
  lyrics text, description text, live_version_notes text, arrangement_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null, city text not null, venue text, starts_at timestamptz not null,
  call_time time, soundcheck_time time, performance_time time,
  ticket_url text, vk_event_url text, description text,
  status text not null default 'planned' check (status in ('planned','announced','in_progress','done','cancelled','archived')),
  tech_notes text, stage_plot_url text, tech_rider_url text, light_timing_url text, video_timing_url text,
  contact_person text, contact_phone text, contact_email text, post_event_report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  project_id uuid references public.projects(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done','cancelled')),
  priority public.priority_level not null default 'normal',
  due_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid references public.projects(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  title text not null, done boolean not null default false,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date, order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.song_materials (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  type text not null,
  title text not null, url text not null, version text,
  status text not null default 'draft' check (status in ('active','outdated','draft','approved','archived')),
  notes text, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  order_index integer not null, live_version text, notes text,
  backing_track_material_id uuid references public.song_materials(id) on delete set null,
  click_track_material_id uuid references public.song_materials(id) on delete set null,
  stems_material_id uuid references public.song_materials(id) on delete set null,
  unique(setlist_id, order_index)
);

create table public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null, starts_at timestamptz not null, location text,
  goals text, notes text, problems text, decisions text, next_tasks text,
  participants uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rehearsal_songs (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  order_index integer not null default 0, notes text, tempo_change integer,
  unique(rehearsal_id, song_id)
);

create table public.promo_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  release_id uuid references public.projects(id) on delete cascade,
  type text not null, platform text, content_text text, media_url text, publication_url text,
  status text not null default 'draft' check (status in ('draft','review','approved','scheduled','published','archived')),
  publish_date timestamptz, responsible_id uuid references public.profiles(id) on delete set null, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null, type text not null, city text, phone text, email text, social_url text, website text,
  notes text, reliability_rating smallint check (reliability_rating between 1 and 5), history text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  type text not null check (type in ('income','expense')),
  category text not null, title text not null, amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'RUB', date date not null default current_date,
  paid_by uuid references public.profiles(id) on delete set null, is_settled boolean not null default true, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid not null,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create table public.entity_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null, entity_id uuid not null,
  access_level public.access_level not null default 'read',
  created_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);

-- Indexes for list filters and relationship lookups.
create index projects_type_idx on public.projects(type);
create index projects_status_idx on public.projects(status);
create index projects_deadline_idx on public.projects(deadline);
create index projects_owner_idx on public.projects(owner_id);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_song_idx on public.tasks(song_id);
create index tasks_event_idx on public.tasks(event_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_status_idx on public.tasks(status);
create index tasks_due_date_idx on public.tasks(due_date);
create index songs_status_idx on public.songs(status);
create index materials_song_idx on public.song_materials(song_id);
create index materials_type_idx on public.song_materials(type);
create index materials_status_idx on public.song_materials(status);
create index events_project_idx on public.events(project_id);
create index events_status_idx on public.events(status);
create index events_starts_at_idx on public.events(starts_at);
create index checklists_project_idx on public.checklists(project_id);
create index checklists_song_idx on public.checklists(song_id);
create index checklists_event_idx on public.checklists(event_id);
create index checklist_items_assignee_idx on public.checklist_items(assignee_id);
create index checklist_items_due_idx on public.checklist_items(due_date);
create index promo_project_idx on public.promo_materials(project_id);
create index promo_event_idx on public.promo_materials(event_id);
create index promo_status_idx on public.promo_materials(status);
create index promo_type_idx on public.promo_materials(type);
create index finance_project_idx on public.finance_records(project_id);
create index finance_event_idx on public.finance_records(event_id);
create index comments_entity_idx on public.comments(entity_type, entity_id);
create index activity_entity_idx on public.activity_log(entity_type, entity_id);
create index access_lookup_idx on public.entity_access(user_id, entity_type, entity_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','projects','tasks','checklist_items','songs','song_materials','events','setlists','rehearsals','promo_materials','contacts','finance_records','comments']
  loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t); end loop;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,full_name,role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'guest')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and public.current_role() <> 'admin' then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end; $$;
create trigger protect_profile_role before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.audit_entity_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_id uuid; payload jsonb;
begin
  target_id := coalesce(new.id, old.id);
  payload := jsonb_build_object('operation', tg_op);
  if tg_op = 'UPDATE' then
    payload := payload || jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;
  insert into public.activity_log(user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(tg_op), tg_table_name, target_id, payload);
  return coalesce(new, old);
end; $$;

-- Security helpers use definer rights to avoid recursive profile/access policies.
create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.has_entity_access(kind text, target uuid, required public.access_level default 'read')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entity_access
    where user_id = auth.uid() and entity_type = kind and entity_id = target
      and (access_level = 'write' or required = 'read')
  )
$$;

create or replace function public.is_internal() returns boolean
language sql stable as $$ select public.current_role() in ('admin','member','manager','pr') $$;

do $$ declare t text; begin
  foreach t in array array['projects','tasks','songs','song_materials','events','rehearsals','promo_materials']
  loop execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_entity_change()', t, t); end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.songs enable row level security;
alter table public.song_materials enable row level security;
alter table public.events enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.rehearsals enable row level security;
alter table public.rehearsal_songs enable row level security;
alter table public.promo_materials enable row level security;
alter table public.contacts enable row level security;
alter table public.finance_records enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.entity_access enable row level security;

-- Profiles.
create policy profiles_read on public.profiles for select to authenticated using (public.is_internal() or id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Projects: internal roles read; admin/member/manager write; invited users get explicit access.
create policy projects_read on public.projects for select to authenticated using (public.is_internal() or public.has_entity_access('project', id));
create policy projects_write on public.projects for all to authenticated using (public.current_role() in ('admin','member','manager') or public.has_entity_access('project', id, 'write')) with check (public.current_role() in ('admin','member','manager') or public.has_entity_access('project', id, 'write'));

-- Tasks: internal roles read; assignees can update; managers/admin/member create.
create policy tasks_read on public.tasks for select to authenticated using (
  public.is_internal() or assignee_id = auth.uid() or public.has_entity_access('task', id)
);
create policy tasks_insert on public.tasks for insert to authenticated with check (public.current_role() in ('admin','member','manager','pr'));
create policy tasks_update on public.tasks for update to authenticated using (
  public.current_role() in ('admin','manager') or assignee_id = auth.uid() or public.has_entity_access('task', id, 'write')
) with check (public.current_role() in ('admin','manager') or assignee_id = auth.uid() or public.has_entity_access('task', id, 'write'));
create policy tasks_delete on public.tasks for delete to authenticated using (public.current_role() in ('admin','manager'));

-- Songs and materials: members read/write; session musicians and guests need explicit grants.
create policy songs_read on public.songs for select to authenticated using (public.is_internal() or public.has_entity_access('song', id));
create policy songs_write on public.songs for all to authenticated using (public.current_role() in ('admin','member') or public.has_entity_access('song', id, 'write')) with check (public.current_role() in ('admin','member') or public.has_entity_access('song', id, 'write'));
create policy materials_read on public.song_materials for select to authenticated using (public.is_internal() or public.has_entity_access('song', song_id) or public.has_entity_access('song_material', id));
create policy materials_write on public.song_materials for all to authenticated using (public.current_role() in ('admin','member') or public.has_entity_access('song', song_id, 'write')) with check (public.current_role() in ('admin','member') or public.has_entity_access('song', song_id, 'write'));

-- Events and connected live data.
create policy events_read on public.events for select to authenticated using (public.is_internal() or public.has_entity_access('event', id));
create policy events_write on public.events for all to authenticated using (public.current_role() in ('admin','member','manager') or public.has_entity_access('event', id, 'write')) with check (public.current_role() in ('admin','member','manager') or public.has_entity_access('event', id, 'write'));
create policy setlists_read on public.setlists for select to authenticated using (public.is_internal() or public.has_entity_access('event', event_id));
create policy setlists_write on public.setlists for all to authenticated using (public.current_role() in ('admin','member','manager') or public.has_entity_access('event', event_id, 'write')) with check (public.current_role() in ('admin','member','manager') or public.has_entity_access('event', event_id, 'write'));
create policy setlist_items_read on public.setlist_items for select to authenticated using (exists(select 1 from public.setlists s where s.id=setlist_id));
create policy setlist_items_write on public.setlist_items for all to authenticated using (public.current_role() in ('admin','member','manager')) with check (public.current_role() in ('admin','member','manager'));

-- Rehearsals.
create policy rehearsals_read on public.rehearsals for select to authenticated using (public.is_internal() or public.has_entity_access('rehearsal', id));
create policy rehearsals_write on public.rehearsals for all to authenticated using (public.current_role() in ('admin','member') or public.has_entity_access('rehearsal', id, 'write')) with check (public.current_role() in ('admin','member') or public.has_entity_access('rehearsal', id, 'write'));
create policy rehearsal_songs_read on public.rehearsal_songs for select to authenticated using (exists(select 1 from public.rehearsals r where r.id=rehearsal_id));
create policy rehearsal_songs_write on public.rehearsal_songs for all to authenticated using (public.current_role() in ('admin','member')) with check (public.current_role() in ('admin','member'));

-- Promo, contacts, finance.
create policy promo_read on public.promo_materials for select to authenticated using (public.current_role() in ('admin','member','manager','pr') or public.has_entity_access('promo', id));
create policy promo_write on public.promo_materials for all to authenticated using (public.current_role() in ('admin','manager','pr')) with check (public.current_role() in ('admin','manager','pr'));
create policy contacts_access on public.contacts for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));
create policy finance_access on public.finance_records for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));

-- Checklists, comments, activity and access grants.
create policy checklists_read on public.checklists for select to authenticated using (public.is_internal() or (event_id is not null and public.has_entity_access('event',event_id)) or (song_id is not null and public.has_entity_access('song',song_id)));
create policy checklists_write on public.checklists for all to authenticated using (public.current_role() in ('admin','member','manager')) with check (public.current_role() in ('admin','member','manager'));
create policy checklist_items_read on public.checklist_items for select to authenticated using (exists(select 1 from public.checklists c where c.id=checklist_id));
create policy checklist_items_write on public.checklist_items for all to authenticated using (public.current_role() in ('admin','member','manager') or assignee_id=auth.uid()) with check (public.current_role() in ('admin','member','manager') or assignee_id=auth.uid());
create policy comments_read on public.comments for select to authenticated using (public.is_internal() or user_id=auth.uid());
create policy comments_insert on public.comments for insert to authenticated with check (user_id=auth.uid());
create policy comments_update_own on public.comments for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (user_id=auth.uid() or public.current_role()='admin');
create policy activity_read on public.activity_log for select to authenticated using (public.is_internal());
create policy activity_insert on public.activity_log for insert to authenticated with check (user_id=auth.uid());
create policy entity_access_read on public.entity_access for select to authenticated using (user_id=auth.uid() or public.current_role()='admin');
create policy entity_access_admin on public.entity_access for all to authenticated using (public.current_role()='admin') with check (public.current_role()='admin');

-- No policy is granted to anon: unauthenticated users see nothing.
