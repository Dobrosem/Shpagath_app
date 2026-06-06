import type { Event, Material, Profile, Project, Song, Task } from "./types";

export const demoProfile: Profile = {
  id: "demo-admin",
  full_name: "Александр Морозов",
  email: "admin@saphath.ru",
  role: "admin",
};

export const people: Profile[] = [
  demoProfile,
  { id: "user-2", full_name: "Михаил Орлов", email: "mikhail@saphath.ru", role: "member" },
  { id: "user-3", full_name: "Анна Волкова", email: "anna@saphath.ru", role: "pr" },
  { id: "user-4", full_name: "Илья Ветров", email: "ilya@saphath.ru", role: "manager" },
];

export const projects: Project[] = [
  { id: "p1", title: "Альбом «Ascension»", type: "release", description: "Запись и выпуск нового полноформатного альбома", status: "in_progress", priority: "critical", deadline: "2026-09-18", owner: people[0], progress: 68 },
  { id: "p2", title: "Saphath · Москва", type: "concert", description: "Большой осенний концерт", status: "in_progress", priority: "high", deadline: "2026-07-24", owner: people[3], progress: 42 },
  { id: "p3", title: "Клип «The Last Light»", type: "video", description: "Съёмка и постпродакшн нового клипа", status: "waiting", priority: "normal", deadline: "2026-08-10", owner: people[2], progress: 25 },
  { id: "p4", title: "Летняя серия репетиций", type: "rehearsal", description: "Подготовка концертной программы", status: "in_progress", priority: "high", deadline: "2026-07-12", owner: people[1], progress: 54 },
];

export const tasks: Task[] = [
  { id: "t1", title: "Утвердить финальный мастер The Last Light", status: "review", priority: "critical", due_date: "2026-06-08", project: projects[0], assignee: people[0] },
  { id: "t2", title: "Отправить технический райдер площадке", status: "in_progress", priority: "high", due_date: "2026-06-10", project: projects[1], assignee: people[3] },
  { id: "t3", title: "Обновить табулатуры гитар", status: "todo", priority: "normal", due_date: "2026-06-13", project: projects[3], assignee: people[1] },
  { id: "t4", title: "Подготовить тизер концерта", status: "todo", priority: "high", due_date: "2026-06-15", project: projects[1], assignee: people[2] },
  { id: "t5", title: "Согласовать смету съёмки", status: "waiting", priority: "normal", due_date: "2026-06-05", project: projects[2], assignee: people[0] },
];

export const songs: Song[] = [
  { id: "s1", title: "The Last Light", subtitle: "Ascension · Track 03", status: "mixing", bpm: 128, key: "Dm", tuning: "Drop C", time_signature: "4/4", duration: 326, arrangement_version: "v7.2", materials_count: 14 },
  { id: "s2", title: "Through the Ashes", subtitle: "Ascension · Track 01", status: "live_ready", bpm: 142, key: "Em", tuning: "Drop C", time_signature: "4/4", duration: 281, arrangement_version: "v5.0 live", materials_count: 11 },
  { id: "s3", title: "Cold Horizon", subtitle: "Ascension · Track 05", status: "recording", bpm: 96, key: "Cm", tuning: "Drop B", time_signature: "6/8", duration: 374, arrangement_version: "v3.4", materials_count: 8 },
  { id: "s4", title: "Ritual", subtitle: "Live repertoire", status: "ready", bpm: 118, key: "F#m", tuning: "Drop C", time_signature: "4/4", duration: 302, arrangement_version: "v4.1", materials_count: 9 },
];

export const events: Event[] = [
  { id: "e1", title: "Saphath · Москва", city: "Москва", venue: "URBAN", starts_at: "2026-07-24T20:00:00+03:00", status: "announced", call_time: "15:00", soundcheck_time: "17:00", performance_time: "20:30" },
  { id: "e2", title: "Metal Over Russia", city: "Санкт-Петербург", venue: "А2", starts_at: "2026-08-15T19:00:00+03:00", status: "planned", call_time: "14:00", soundcheck_time: "16:00", performance_time: "21:10" },
  { id: "e3", title: "Saphath · Нижний Новгород", city: "Нижний Новгород", venue: "MILO", starts_at: "2026-09-05T19:30:00+03:00", status: "planned" },
];

export const materials: Material[] = [
  { id: "m1", song_id: "s1", type: "reaper_project", title: "Reaper project · full session", url: "https://disk.yandex.ru", version: "v7.2", status: "active" },
  { id: "m2", song_id: "s1", type: "guitar_tabs", title: "Guitar tabs", url: "https://drive.google.com", version: "v6", status: "approved" },
  { id: "m3", song_id: "s1", type: "orchestral_score", title: "Full orchestral score", url: "https://drive.google.com", version: "v4", status: "approved" },
  { id: "m4", song_id: "s1", type: "click_track", title: "Live click 128 BPM", url: "https://disk.yandex.ru", version: "v2", status: "active" },
  { id: "m5", song_id: "s1", type: "backing_track", title: "Live backing track", url: "https://disk.yandex.ru", version: "v2", status: "draft" },
];

export const activity = [
  { id: "a1", user: "Михаил Орлов", action: "обновил табулатуры", target: "The Last Light", at: "12 минут назад" },
  { id: "a2", user: "Анна Волкова", action: "добавила афишу", target: "Saphath · Москва", at: "48 минут назад" },
  { id: "a3", user: "Илья Ветров", action: "изменил статус задачи", target: "Технический райдер", at: "2 часа назад" },
  { id: "a4", user: "Александр Морозов", action: "утвердил материал", target: "Orchestral score v4", at: "вчера" },
];
