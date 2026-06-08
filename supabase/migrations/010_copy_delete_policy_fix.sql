-- Fix Copy Library delete policy for databases where migration 009 was already
-- applied before the delete policy was added.

drop policy if exists copy_items_workspace_delete on public.copy_items;
create policy copy_items_workspace_delete on public.copy_items
for delete to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));
