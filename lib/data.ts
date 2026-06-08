import { createClient } from "./supabase/server";
import { demoProfile, events, people, projects, songs, tasks } from "./demo-data";
import { buildRedZoneIssues, criticalMaterialTypes } from "./red-zone";
import { getStorageDisplayUrl } from "./storage";
import type {
  Album,
  Contact,
  CopyItem,
  CopyStatus,
  Event,
  EpkProfile,
  EventSetlist,
  FinanceRecord,
  Material,
  MaterialBackup,
  PackingList,
  Profile,
  Project,
  PromoMaterial,
  RedZoneIssue,
  Rehearsal,
  Song,
  Task,
  TaskTemplate,
} from "./types";

function reportReadError(entity: string, error: { message: string } | null) {
  if (error) console.error(`Supabase read ${entity} error:`, error);
}

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  if (!supabase) return demoProfile;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    reportReadError("auth user", authError);
    return demoProfile;
  }

  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    const { error: ensureError } = await supabase.rpc("ensure_profile");
    reportReadError("ensure_profile", ensureError);
    if (!ensureError) {
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      data = result.data;
      error = result.error;
    }
  }
  reportReadError("profile", error);
  return data
    ? { ...data, locale: data.locale === "en" ? "en" : "ru" }
    : {
        ...demoProfile,
        id: user.id,
        email: user.email ?? demoProfile.email,
        full_name: String(user.user_metadata?.full_name ?? demoProfile.full_name),
      };
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return people;
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  reportReadError("profiles", error);
  return ((data ?? []).map((profile) => ({
    ...profile,
    locale: profile.locale === "en" ? "en" : "ru",
  }))) as Profile[];
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  if (!supabase) return projects;
  const { data, error } = await supabase
    .from("projects")
    .select("*, owner:profiles!owner_id(id, full_name)")
    .order("deadline");
  reportReadError("projects", error);
  return (data as Project[]) ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return tasks;
  const { data, error } = await supabase
    .from("tasks")
    .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
    .order("due_date");
  reportReadError("tasks", error);
  return (data as Task[]) ?? [];
}

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data, error } = await supabase
    .from("songs")
    .select("*, album:albums(id,title,type,status,cover_image_url), song_materials(type, material_backups(status))")
    .order("created_at", { ascending: false });
  reportReadError("songs", error);
  return Promise.all((data ?? []).map(async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    return {
    ...song,
    album: album ? {
      ...album,
      cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url),
    } : null,
    cover_display_url: await getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
    materials_count: song.song_materials?.length ?? 0,
    missing_backups_count: (song.song_materials ?? []).filter(
      (material: { type: string; material_backups?: { status: string }[] }) =>
        criticalMaterialTypes.has(material.type)
        && material.material_backups?.[0]?.status !== "ok",
    ).length,
  };})) as Promise<Song[]>;
}

export async function getAlbums(): Promise<Album[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("albums")
    .select("*, songs(id,title,track_number)")
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  reportReadError("albums", error);
  return Promise.all(((data as Album[]) ?? []).map(async (album) => ({
    ...album,
    cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url),
    songs_count: album.songs?.length ?? 0,
  })));
}

export async function getAlbum(id: string): Promise<Album | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("albums")
    .select("*, songs(*)")
    .eq("id", id)
    .order("track_number", { referencedTable: "songs", ascending: true, nullsFirst: false })
    .maybeSingle();
  reportReadError("album", error);
  if (!data) return null;
  const album = data as Album;
  return {
    ...album,
    cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url),
    songs: await Promise.all((album.songs ?? []).map(async (song) => ({
      ...song,
      cover_display_url: await getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
    }))),
    songs_count: album.songs?.length ?? 0,
  };
}

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data, error } = await supabase.from("events").select("*").order("starts_at");
  reportReadError("events", error);
  return Promise.all(((data as Event[]) ?? []).map(async (event) => ({
    ...event,
    poster_display_url: await getStorageDisplayUrl(supabase, "event-posters", event.poster_image_url),
  })));
}

export async function getEventSetlist(eventId: string): Promise<EventSetlist | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("setlists")
    .select("*, items:setlist_items(*, song:songs(id,title,bpm,key,tuning))")
    .eq("event_id", eventId)
    .order("order_index", { referencedTable: "setlist_items" })
    .limit(1)
    .maybeSingle();
  reportReadError("event setlist", error);
  return (data as EventSetlist | null) ?? null;
}

export async function getRehearsals(): Promise<Rehearsal[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("rehearsals").select("*").order("starts_at");
  reportReadError("rehearsals", error);
  return (data as Rehearsal[]) ?? [];
}

export async function getPromoMaterials(): Promise<PromoMaterial[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("promo_materials")
    .select("*")
    .order("publish_date");
  reportReadError("promo materials", error);
  return (data as PromoMaterial[]) ?? [];
}

export async function getEpkProfiles(): Promise<EpkProfile[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("epk_profiles")
    .select("*, media_links:epk_media_links(id)")
    .order("created_at", { ascending: false });
  reportReadError("epk profiles", error);
  return (data as EpkProfile[]) ?? [];
}

export async function getEpkProfile(id: string): Promise<EpkProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("epk_profiles")
    .select("*, media_links:epk_media_links(*)")
    .eq("id", id)
    .order("order_index", { referencedTable: "epk_media_links" })
    .maybeSingle();
  reportReadError("epk profile", error);
  return (data as EpkProfile | null) ?? null;
}

export async function getCopyItems(status?: CopyStatus | "all"): Promise<CopyItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("copy_items")
    .select("*, event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug)")
    .order("updated_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  reportReadError("copy items", error);
  return (data as CopyItem[]) ?? [];
}

export async function getCopyItem(id: string): Promise<CopyItem | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("copy_items")
    .select("*, event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug), versions:copy_item_versions(*, author:profiles!created_by(id,full_name))")
    .eq("id", id)
    .order("created_at", { referencedTable: "copy_item_versions", ascending: false })
    .maybeSingle();
  reportReadError("copy item", error);
  return (data as CopyItem | null) ?? null;
}

export async function getRelatedCopyItems(relation: "event_id" | "album_id" | "song_id" | "epk_id", id: string): Promise<CopyItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("copy_items")
    .select("id,title,category,channel,language,status,body,updated_at,event_id,album_id,song_id,epk_id")
    .eq(relation, id)
    .order("updated_at", { ascending: false })
    .limit(6);
  reportReadError("related copy items", error);
  return (data as CopyItem[]) ?? [];
}

export async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("contacts").select("*").order("name");
  reportReadError("contacts", error);
  return (data as Contact[]) ?? [];
}

export async function getFinanceRecords(): Promise<FinanceRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("finance_records")
    .select("*")
    .order("date", { ascending: false });
  reportReadError("finance records", error);
  return (data as FinanceRecord[]) ?? [];
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("task_templates")
    .select("*, items:task_template_items(*)")
    .order("title");
  reportReadError("task templates", error);
  return (data as TaskTemplate[]) ?? [];
}

export async function getPackingLists(): Promise<PackingList[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("packing_lists")
    .select("*, event:events(id,title), project:projects(id,title), items:packing_list_items(*)")
    .order("created_at", { ascending: false });
  reportReadError("packing lists", error);
  return (data as PackingList[]) ?? [];
}

export async function getPackingList(id: string): Promise<PackingList | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("packing_lists")
    .select("*, event:events(id,title), project:projects(id,title), items:packing_list_items(*, responsible:profiles!responsible_id(id,full_name))")
    .eq("id", id)
    .order("order_index", { referencedTable: "packing_list_items" })
    .maybeSingle();
  reportReadError("packing list", error);
  return (data as PackingList | null) ?? null;
}

export async function getRedZoneIssues(eventId?: string): Promise<RedZoneIssue[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let eventQuery = supabase.from("events").select("*").order("starts_at");
  if (eventId) eventQuery = eventQuery.eq("id", eventId);

  const [tasksResult, eventsResult, promoResult, materialsResult, backupsResult, setlistsResult] =
    await Promise.all([
      supabase.from("tasks").select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)"),
      eventQuery,
      supabase.from("promo_materials").select("*"),
      supabase.from("song_materials").select("*, song:songs(title)"),
      supabase.from("material_backups").select("*"),
      supabase.from("setlists").select("event_id, setlist_items(count)"),
    ]);

  reportReadError("red zone tasks", tasksResult.error);
  reportReadError("red zone events", eventsResult.error);
  reportReadError("red zone promo", promoResult.error);
  reportReadError("red zone materials", materialsResult.error);
  reportReadError("red zone backups", backupsResult.error);
  reportReadError("red zone setlists", setlistsResult.error);

  const selectedEvents = (eventsResult.data as Event[]) ?? [];
  const selectedEventIds = new Set(selectedEvents.map((event) => event.id));
  const selectedTasks = ((tasksResult.data as Task[]) ?? []).filter(
    (task) => !eventId || task.event_id === eventId,
  );
  const selectedPromo = ((promoResult.data as PromoMaterial[]) ?? []).filter(
    (item) => !eventId || item.event_id === eventId,
  );

  return buildRedZoneIssues({
    tasks: selectedTasks,
    events: selectedEvents,
    promo: selectedPromo,
    materials: eventId ? [] : ((materialsResult.data as (Material & { song?: { title: string } })[]) ?? []),
    backups: (backupsResult.data as MaterialBackup[]) ?? [],
    setlistEventIds: new Set(
      (setlistsResult.data ?? [])
        .filter((setlist) => (setlist.setlist_items?.[0]?.count ?? 0) > 0)
        .map((setlist) => setlist.event_id as string)
        .filter((id) => !eventId || selectedEventIds.has(id)),
    ),
  });
}

export async function getMyWorkspace() {
  const supabase = await createClient();
  if (!supabase) {
    return { tasks, songs, materials: [] as Material[], events, rehearsals: [] as Rehearsal[] };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { tasks: [] as Task[], songs: [] as Song[], materials: [] as Material[], events: [] as Event[], rehearsals: [] as Rehearsal[] };
  }

  const [taskResult, materialResult, accessResult, rehearsalResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .order("due_date"),
    supabase
      .from("song_materials")
      .select("*, material_backups(*)")
      .eq("created_by", user.id),
    supabase
      .from("entity_access")
      .select("entity_type,entity_id")
      .eq("user_id", user.id),
    supabase.from("rehearsals").select("*").order("starts_at"),
  ]);
  reportReadError("my tasks", taskResult.error);
  reportReadError("my materials", materialResult.error);
  reportReadError("my access", accessResult.error);
  reportReadError("my rehearsals", rehearsalResult.error);

  const myTasks = (taskResult.data as Task[]) ?? [];
  const ownMaterials = (materialResult.data ?? []).map((material) => ({
    ...material,
    backup: material.material_backups?.[0] ?? null,
  })) as Material[];
  const access = accessResult.data ?? [];
  const songIds = new Set([
    ...myTasks.map((task) => task.song_id).filter(Boolean),
    ...ownMaterials.map((material) => material.song_id),
    ...access.filter((item) => item.entity_type === "song").map((item) => item.entity_id),
  ] as string[]);
  const eventIds = new Set([
    ...myTasks.map((task) => task.event_id).filter(Boolean),
    ...access.filter((item) => item.entity_type === "event").map((item) => item.entity_id),
  ] as string[]);
  const rehearsalIds = new Set(
    access.filter((item) => item.entity_type === "rehearsal").map((item) => item.entity_id),
  );

  const [songResult, relatedMaterialsResult, eventResult] = await Promise.all([
    songIds.size
      ? supabase.from("songs").select("*, album:albums(id,title,type,status,cover_image_url)").in("id", [...songIds])
      : Promise.resolve({ data: [], error: null }),
    songIds.size
      ? supabase.from("song_materials").select("*, material_backups(*)").in("song_id", [...songIds])
      : Promise.resolve({ data: [], error: null }),
    eventIds.size
      ? supabase.from("events").select("*").in("id", [...eventIds]).order("starts_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  reportReadError("my songs", songResult.error);
  reportReadError("my related materials", relatedMaterialsResult.error);
  reportReadError("my events", eventResult.error);

  const relatedMaterials = (relatedMaterialsResult.data ?? []).map((material) => ({
    ...material,
    backup: material.material_backups?.[0] ?? null,
  })) as Material[];
  const materialsById = new Map(
    [...ownMaterials, ...relatedMaterials].map((material) => [material.id, material]),
  );
  const myRehearsals = ((rehearsalResult.data as Rehearsal[]) ?? []).filter(
    (rehearsal) =>
      rehearsalIds.has(rehearsal.id)
      || rehearsal.participants?.includes(user.id),
  );

  const mySongs = await Promise.all(((songResult.data as Song[]) ?? []).map(async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    return {
      ...song,
      album: album ? {
        ...album,
        cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url),
      } : null,
      cover_display_url: await getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
    };
  }));
  const myEvents = await Promise.all(((eventResult.data as Event[]) ?? []).map(async (event) => ({
    ...event,
    poster_display_url: await getStorageDisplayUrl(supabase, "event-posters", event.poster_image_url),
  })));

  return {
    tasks: myTasks,
    songs: mySongs,
    materials: [...materialsById.values()],
    events: myEvents,
    rehearsals: myRehearsals,
  };
}
