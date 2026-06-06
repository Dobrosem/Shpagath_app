import { createClient } from "./supabase/server";
import { demoProfile, events, projects, songs, tasks } from "./demo-data";
import type { Event, Profile, Project, Song, Task } from "./types";

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  if (!supabase) return demoProfile;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return demoProfile;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? { ...demoProfile, id: user.id, email: user.email ?? demoProfile.email };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  if (!supabase) return projects;
  const { data } = await supabase.from("projects").select("*, owner:profiles!owner_id(id, full_name)").order("deadline");
  return (data as Project[]) ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return tasks;
  const { data } = await supabase.from("tasks").select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)").order("due_date");
  return (data as Task[]) ?? [];
}

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data } = await supabase.from("songs").select("*, song_materials(count)").order("title");
  return (data ?? []).map((song) => ({ ...song, materials_count: song.song_materials?.[0]?.count ?? 0 })) as Song[];
}

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data } = await supabase.from("events").select("*").order("starts_at");
  return (data as Event[]) ?? [];
}
