export type Role = "admin" | "member" | "guest" | "session_musician" | "manager" | "pr";
export type Status = "idea" | "draft" | "todo" | "demo" | "arrangement" | "recording" | "mixing" | "mastering" | "in_progress" | "waiting" | "review" | "approved" | "done" | "archived" | "cancelled" | "ready" | "live_ready" | "planned" | "announced" | "scheduled" | "published";
export type Priority = "low" | "normal" | "high" | "critical";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
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
  materials_count?: number;
}

export interface Event {
  id: string;
  title: string;
  city: string;
  venue?: string | null;
  starts_at: string;
  status: Status;
  call_time?: string | null;
  soundcheck_time?: string | null;
  performance_time?: string | null;
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
}
