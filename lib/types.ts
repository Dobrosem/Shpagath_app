export type Role = "admin" | "member" | "guest" | "session_musician" | "manager" | "pr";
export type Locale = "ru" | "en";
export type Status = "idea" | "draft" | "todo" | "demo" | "arrangement" | "recording" | "mixing" | "mastering" | "in_progress" | "waiting" | "review" | "approved" | "done" | "archived" | "cancelled" | "ready" | "live_ready" | "planned" | "announced" | "scheduled" | "published";
export type Priority = "low" | "normal" | "high" | "critical";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  locale: Locale;
  avatar_url?: string | null;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  description?: string;
  status: Status;
  priority: Priority;
  deadline?: string | null;
  owner?: Pick<Profile, "id" | "full_name">;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  due_date?: string | null;
  project_id?: string | null;
  song_id?: string | null;
  event_id?: string | null;
  assignee_id?: string | null;
  created_by?: string | null;
  project?: Pick<Project, "id" | "title">;
  assignee?: Pick<Profile, "id" | "full_name">;
}

export interface Song {
  id: string;
  title: string;
  subtitle?: string | null;
  status: Status;
  bpm?: number | null;
  key?: string | null;
  tuning?: string | null;
  time_signature?: string | null;
  duration?: number | null;
  arrangement_version?: string | null;
  lyrics?: string | null;
  description?: string | null;
  live_version_notes?: string | null;
  cover_image_url?: string | null;
  cover_display_url?: string | null;
  cover_status?: "draft" | "review" | "approved" | "outdated" | "archived";
  cover_notes?: string | null;
  materials_count?: number;
  missing_backups_count?: number;
}

export interface Event {
  id: string;
  title: string;
  city: string;
  venue?: string | null;
  starts_at: string;
  status: Status;
  project_id?: string | null;
  call_time?: string | null;
  arrival_time?: string | null;
  load_in_time?: string | null;
  soundcheck_time?: string | null;
  performance_time?: string | null;
  doors_time?: string | null;
  show_start_time?: string | null;
  show_end_time?: string | null;
  curfew_time?: string | null;
  backstage_info?: string | null;
  venue_address?: string | null;
  organizer_contact?: string | null;
  sound_engineer_contact?: string | null;
  light_engineer_contact?: string | null;
  emergency_notes?: string | null;
  ticket_url?: string | null;
  tech_rider_url?: string | null;
  stage_plot_url?: string | null;
  light_timing_url?: string | null;
  video_timing_url?: string | null;
  tech_notes?: string | null;
  vk_event_url?: string | null;
  description?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  poster_image_url?: string | null;
  poster_display_url?: string | null;
  poster_status?: "draft" | "review" | "approved" | "outdated" | "archived";
  poster_notes?: string | null;
}

export interface EventSetlistItem {
  id: string;
  setlist_id: string;
  song_id: string;
  order_index: number;
  live_version?: string | null;
  notes?: string | null;
  song?: Pick<Song, "id" | "title" | "bpm" | "key" | "tuning"> | null;
}

export interface EventSetlist {
  id: string;
  event_id: string;
  title: string;
  notes?: string | null;
  items?: EventSetlistItem[];
}

export interface Material {
  id: string;
  song_id: string;
  type: string;
  title: string;
  url: string;
  version?: string | null;
  status: "active" | "outdated" | "draft" | "approved" | "archived";
  notes?: string | null;
  created_by?: string | null;
  backup?: MaterialBackup | null;
}

export interface Rehearsal {
  id: string;
  project_id?: string | null;
  title: string;
  starts_at: string;
  location?: string | null;
  goals?: string | null;
  status?: Status;
  participants?: string[];
}

export interface PromoMaterial {
  id: string;
  title: string;
  type: string;
  platform?: string | null;
  status: Status;
  publish_date?: string | null;
  event_id?: string | null;
  project_id?: string | null;
}

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description?: string | null;
  relative_day: number;
  priority: Priority;
  default_role?: Role | null;
  order_index: number;
}

export interface TaskTemplate {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  items?: TaskTemplateItem[];
}

export interface PackingListItem {
  id: string;
  packing_list_id: string;
  title: string;
  category: string;
  quantity: number;
  packed: boolean;
  responsible_id?: string | null;
  responsible?: Pick<Profile, "id" | "full_name"> | null;
  notes?: string | null;
  order_index: number;
}

export interface PackingList {
  id: string;
  title: string;
  type: string;
  event_id?: string | null;
  project_id?: string | null;
  created_by: string;
  event?: Pick<Event, "id" | "title"> | null;
  project?: Pick<Project, "id" | "title"> | null;
  items?: PackingListItem[];
  created_at?: string;
}

export interface MaterialBackup {
  id: string;
  material_id: string;
  backup_url?: string | null;
  backup_location?: string | null;
  has_local_copy: boolean;
  has_cloud_copy: boolean;
  usb_copy_confirmed?: boolean;
  verified_at?: string | null;
  last_checked_at?: string | null;
  responsible_id?: string | null;
  status: "missing_backup" | "unchecked" | "ok" | "problem";
  notes?: string | null;
}

export type RedZoneKind =
  | "overdue_task"
  | "critical_task"
  | "missing_ticket"
  | "overdue_promo"
  | "missing_backup"
  | "missing_setlist"
  | "missing_rider"
  | "missing_battle_sheet";

export interface RedZoneIssue {
  id: string;
  kind: RedZoneKind;
  severity: "warning" | "critical";
  title: string;
  href: string;
  date?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  reliability_rating?: number | null;
}

export interface FinanceRecord {
  id: string;
  title: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  currency: string;
  date: string;
}

export interface ActionState {
  success: boolean;
  error: string | null;
  id?: string;
  count?: number;
}
