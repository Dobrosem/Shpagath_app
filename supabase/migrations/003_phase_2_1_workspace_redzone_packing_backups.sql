-- Phase 2.1: personal workspace, task templates, packing lists and material backups.

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title, type)
);

create table if not exists public.task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  title text not null,
  description text,
  relative_day integer not null default 0,
  priority public.priority_level not null default 'normal',
  default_role public.user_role,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, title)
);

create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('local_concert', 'tour', 'festival', 'rehearsal', 'recording')),
  event_id uuid references public.events(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  quantity integer not null default 1 check (quantity > 0),
  packed boolean not null default false,
  responsible_id uuid references public.profiles(id) on delete set null,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.material_backups (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.song_materials(id) on delete cascade,
  backup_url text,
  backup_location text,
  has_local_copy boolean not null default false,
  has_cloud_copy boolean not null default false,
  verified_at timestamptz,
  responsible_id uuid references public.profiles(id) on delete set null,
  status text not null default 'missing_backup'
    check (status in ('missing_backup', 'unchecked', 'ok', 'problem')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_template_items_template_idx
  on public.task_template_items(template_id, order_index);
create index if not exists packing_lists_event_idx on public.packing_lists(event_id);
create index if not exists packing_lists_project_idx on public.packing_lists(project_id);
create index if not exists packing_lists_created_by_idx on public.packing_lists(created_by);
create index if not exists packing_list_items_list_idx
  on public.packing_list_items(packing_list_id, order_index);
create index if not exists packing_list_items_responsible_idx
  on public.packing_list_items(responsible_id);
create index if not exists material_backups_material_idx on public.material_backups(material_id);
create index if not exists material_backups_status_idx on public.material_backups(status);
create index if not exists material_backups_responsible_idx on public.material_backups(responsible_id);

drop trigger if exists set_task_templates_updated_at on public.task_templates;
create trigger set_task_templates_updated_at
before update on public.task_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_packing_lists_updated_at on public.packing_lists;
create trigger set_packing_lists_updated_at
before update on public.packing_lists
for each row execute function public.set_updated_at();

drop trigger if exists set_material_backups_updated_at on public.material_backups;
create trigger set_material_backups_updated_at
before update on public.material_backups
for each row execute function public.set_updated_at();

insert into public.task_templates (title, type, description)
values (
  'Concert preparation',
  'concert',
  'Standard preparation plan calculated backwards from the event date.'
)
on conflict (title, type) do nothing;

with concert_template as (
  select id from public.task_templates
  where title = 'Concert preparation' and type = 'concert'
  limit 1
)
insert into public.task_template_items
  (template_id, title, relative_day, priority, default_role, order_index)
select concert_template.id, item.title, item.relative_day, item.priority::public.priority_level,
  item.default_role::public.user_role, item.order_index
from concert_template
cross join (values
  ('Confirm venue and event contact', -45, 'high', 'manager', 10),
  ('Publish event announcement', -30, 'high', 'pr', 20),
  ('Confirm technical rider', -21, 'high', 'manager', 30),
  ('Prepare poster and ticket links', -21, 'normal', 'pr', 40),
  ('Draft setlist', -14, 'high', 'member', 50),
  ('Confirm transport and load-in', -10, 'normal', 'manager', 60),
  ('Prepare battle sheet', -7, 'critical', 'manager', 70),
  ('Verify backing tracks and click', -5, 'critical', 'member', 80),
  ('Complete packing list', -3, 'high', 'member', 90),
  ('Final team briefing', -1, 'high', 'manager', 100),
  ('Post-event report', 1, 'normal', 'manager', 110)
) as item(title, relative_day, priority, default_role, order_index)
on conflict (template_id, title) do nothing;

create or replace function public.can_access_packing_list(target uuid, required public.access_level default 'read')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.packing_lists list
    where list.id = target
      and (
        public.is_internal()
        or list.created_by = auth.uid()
        or public.has_entity_access('packing_list', list.id, required)
        or (list.event_id is not null and public.has_entity_access('event', list.event_id, required))
        or (list.project_id is not null and public.has_entity_access('project', list.project_id, required))
      )
  )
$$;

alter table public.task_templates enable row level security;
alter table public.task_template_items enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;
alter table public.material_backups enable row level security;

create policy task_templates_read on public.task_templates
for select to authenticated using (public.is_internal());
create policy task_templates_write on public.task_templates
for all to authenticated
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

create policy task_template_items_read on public.task_template_items
for select to authenticated using (public.is_internal());
create policy task_template_items_write on public.task_template_items
for all to authenticated
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

create policy packing_lists_read on public.packing_lists
for select to authenticated using (
  public.is_internal()
  or created_by = auth.uid()
  or public.has_entity_access('packing_list', id)
  or (event_id is not null and public.has_entity_access('event', event_id))
  or (project_id is not null and public.has_entity_access('project', project_id))
);
create policy packing_lists_insert on public.packing_lists
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_role() in ('admin', 'member', 'manager', 'pr')
);
create policy packing_lists_update on public.packing_lists
for update to authenticated
using (
  created_by = auth.uid()
  or public.current_role() in ('admin', 'manager')
  or public.has_entity_access('packing_list', id, 'write')
)
with check (
  created_by = auth.uid()
  or public.current_role() in ('admin', 'manager')
  or public.has_entity_access('packing_list', id, 'write')
);
create policy packing_lists_delete on public.packing_lists
for delete to authenticated using (
  created_by = auth.uid()
  or public.current_role() in ('admin', 'manager')
);

create policy packing_list_items_read on public.packing_list_items
for select to authenticated using (public.can_access_packing_list(packing_list_id));
create policy packing_list_items_insert on public.packing_list_items
for insert to authenticated
with check (public.can_access_packing_list(packing_list_id, 'write'));
create policy packing_list_items_update on public.packing_list_items
for update to authenticated
using (
  responsible_id = auth.uid()
  or public.can_access_packing_list(packing_list_id, 'write')
)
with check (
  responsible_id = auth.uid()
  or public.can_access_packing_list(packing_list_id, 'write')
);
create policy packing_list_items_delete on public.packing_list_items
for delete to authenticated using (public.can_access_packing_list(packing_list_id, 'write'));

create policy material_backups_read on public.material_backups
for select to authenticated using (
  public.is_internal()
  or responsible_id = auth.uid()
  or public.has_entity_access('song_material', material_id)
  or exists (
    select 1 from public.song_materials material
    where material.id = material_id
      and public.has_entity_access('song', material.song_id)
  )
);
create policy material_backups_insert on public.material_backups
for insert to authenticated with check (
  public.current_role() in ('admin', 'member')
  or responsible_id = auth.uid()
  or public.has_entity_access('song_material', material_id, 'write')
  or exists (
    select 1 from public.song_materials material
    where material.id = material_id
      and public.has_entity_access('song', material.song_id, 'write')
  )
);
create policy material_backups_update on public.material_backups
for update to authenticated
using (
  public.current_role() in ('admin', 'member')
  or responsible_id = auth.uid()
  or public.has_entity_access('song_material', material_id, 'write')
)
with check (
  public.current_role() in ('admin', 'member')
  or responsible_id = auth.uid()
  or public.has_entity_access('song_material', material_id, 'write')
);
create policy material_backups_delete on public.material_backups
for delete to authenticated using (
  public.current_role() in ('admin', 'member')
  or responsible_id = auth.uid()
);

