import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckSquare2,
  FileText,
  Gauge,
  Megaphone,
  Music2,
  RadioTower,
  ShieldAlert,
} from "lucide-react";
import { Metric, PageHeader, SectionHeader } from "@/components/ui";
import {
  getDashboardContentItems,
  getDashboardEpkCount,
  getDashboardTasks,
  getDashboardUpcomingEvents,
  getProfile,
  getRedZoneIssues,
} from "@/lib/data";
import { translate, translator, translateEnum, type TranslationKey } from "@/lib/i18n";
import type { ContentCalendarItem, Event, Locale, Profile, RedZoneIssue, Task } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const inactiveTaskStatuses = new Set(["done", "cancelled", "archived"]);

function statusTone(status: string) {
  if (["done", "approved", "released", "ready", "published", "active"].includes(status)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (["in_progress", "recording", "mixing", "announced"].includes(status)) {
    return "border-blue-500/25 bg-blue-500/10 text-blue-300";
  }
  if (["review", "waiting", "scheduled", "draft", "idea"].includes(status)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }
  return "border-white/10 bg-white/5 text-zinc-300";
}

function MiniBadge({ value, locale, context }: { value: string; locale: Locale; context?: string }) {
  return <span className={cn("badge", statusTone(value))}>
    <i className="h-1.5 w-1.5 rounded-full bg-current" />
    {translateEnum(locale, value, value, context)}
  </span>;
}

function DashboardPanel({
  title,
  href,
  tone,
  children,
}: {
  title: string;
  href?: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return <section>
    <SectionHeader title={title} href={href} />
    <div className={cn(
      "metal-card divide-y overflow-hidden",
      tone === "danger"
        ? "divide-red-500/10 border-red-500/20 bg-red-950/20"
        : "divide-white/[.055]",
    )}>{children}</div>
  </section>;
}

function PanelEmpty({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className="p-6 text-center">
    <p className="text-sm text-zinc-600">{text}</p>
    <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-white">
      {label}<ArrowUpRight size={13} />
    </Link>
  </div>;
}

function ShowRow({ event, locale, openLabel }: { event: Event; locale: Locale; openLabel: string }) {
  return <Link href={`/events/${event.id}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[.025]">
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[.035] text-zinc-400">
      <CalendarDays size={17} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-medium text-zinc-200">{event.title}</p>
        <MiniBadge value={event.status} locale={locale} context="event" />
      </div>
      <p className="mt-1 truncate text-xs text-zinc-600">
        {formatDate(event.starts_at, true, locale)} · {[event.city, event.venue].filter(Boolean).join(" · ")}
      </p>
    </div>
    <span className="hidden shrink-0 text-xs text-zinc-600 sm:inline">{openLabel}</span>
    <ArrowUpRight size={14} className="shrink-0 text-zinc-700" />
  </Link>;
}

function taskLinkedContext(task: Task, locale: Locale) {
  if (task.event) return `${translate(locale, "dashboard.forEvent")}: ${task.event.title}`;
  if (task.song) return `${translate(locale, "dashboard.forSong")}: ${task.song.title}`;
  if (task.project) return `${translate(locale, "dashboard.forProject")}: ${task.project.title}`;
  return translate(locale, "dashboard.noLinkedItem");
}

function TaskRow({ task, locale, openLabel }: { task: Task; locale: Locale; openLabel: string }) {
  return <Link href="/tasks" className="flex items-center gap-3 p-4 transition hover:bg-white/[.025]">
    <div className={cn(
      "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
      task.priority === "critical" ? "bg-red-500/10 text-red-300" : task.priority === "high" ? "bg-amber-500/10 text-amber-300" : "bg-white/[.035] text-zinc-400",
    )}>
      <CheckSquare2 size={17} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-medium text-zinc-200">{task.title}</p>
        <MiniBadge value={task.status} locale={locale} />
      </div>
      <p className="mt-1 truncate text-xs text-zinc-400">{taskLinkedContext(task, locale)}</p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-[.12em] text-zinc-700">
        {[task.assignee?.full_name, formatDate(task.due_date, false, locale)].filter(Boolean).join(" · ")}
      </p>
    </div>
    <span className="hidden shrink-0 text-xs text-zinc-600 sm:inline">{openLabel}</span>
    <ArrowUpRight size={14} className="shrink-0 text-zinc-700" />
  </Link>;
}

function RedZoneRow({ issue, locale }: { issue: RedZoneIssue; locale: Locale }) {
  return <Link href={issue.href} className="flex items-start gap-3 p-4 transition hover:bg-red-500/[.035]">
    <div className={cn(
      "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg",
      issue.severity === "critical" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300",
    )}>
      {issue.severity === "critical" ? <ShieldAlert size={17} /> : <AlertTriangle size={17} />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("text-[9px] uppercase tracking-wider", issue.severity === "critical" ? "text-red-400" : "text-amber-400")}>
          {translateEnum(locale, issue.severity, issue.severity)}
        </span>
        <span className="text-[10px] text-zinc-600">{translate(locale, `redZone.${issue.kind}` as TranslationKey)}</span>
      </div>
      <p className="mt-1 truncate text-sm text-zinc-200">{issue.title}</p>
      {issue.date && <p className="mt-1 text-[10px] text-zinc-600">{formatDate(issue.date, false, locale)}</p>}
    </div>
    <ArrowUpRight size={14} className="mt-2 shrink-0 text-zinc-700" />
  </Link>;
}

function ContentRow({ item, locale }: { item: ContentCalendarItem; locale: Locale }) {
  return <Link href={`/content-calendar/${item.id}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[.025]">
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[.035] text-zinc-400"><Megaphone size={17} /></div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
        <MiniBadge value={item.status} locale={locale} />
      </div>
      <p className="mt-1 truncate text-xs text-zinc-600">
        {formatDate(item.scheduled_at, true, locale)} · {translateEnum(locale, item.channel)}
      </p>
    </div>
    <ArrowUpRight size={14} className="shrink-0 text-zinc-700" />
  </Link>;
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function DashboardPage() {
  const [profileResult, tasksResult, eventsResult, issuesResult, contentResult, epkCountResult] = await Promise.allSettled([
    getProfile(),
    getDashboardTasks(),
    getDashboardUpcomingEvents(),
    getRedZoneIssues(),
    getDashboardContentItems(),
    getDashboardEpkCount(),
  ]);
  const profile = settledValue(profileResult, {
    id: "",
    full_name: "Saphath",
    email: "",
    role: "member",
    locale: "ru",
  } satisfies Profile);
  const allTasks = settledValue(tasksResult, [] as Task[]);
  const upcomingEvents = settledValue(eventsResult, [] as Event[]);
  const issues = settledValue(issuesResult, [] as RedZoneIssue[]);
  const contentItems = settledValue(contentResult, [] as ContentCalendarItem[]);
  const epkCount = settledValue(epkCountResult, 0);
  const t = translator(profile.locale);
  const now = new Date();
  const activeTasks = allTasks.filter((task) => !inactiveTaskStatuses.has(task.status));
  const prioritizedTasks = [...activeTasks].sort((left, right) => {
    const leftOverdue = left.due_date && new Date(left.due_date) < now ? 0 : 1;
    const rightOverdue = right.due_date && new Date(right.due_date) < now ? 0 : 1;
    if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
    const priorityRank = { critical: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDiff) return priorityDiff;
    return (left.due_date ?? "9999").localeCompare(right.due_date ?? "9999");
  });
  const dashboardContent = contentItems.slice(0, 5);
  const quickActions = [
    { href: "/events?create=1", label: t("dashboard.actionNewEvent"), icon: CalendarDays },
    { href: "/songs?create=1", label: t("dashboard.actionNewSong"), icon: Music2 },
    { href: "/epk", label: t("dashboard.actionNewEpk"), icon: RadioTower },
    { href: "/copy", label: t("dashboard.actionNewCopy"), icon: FileText },
    { href: "/content-calendar", label: t("dashboard.actionContentCalendar"), icon: Megaphone },
    { href: "/settings", label: t("dashboard.actionSettings"), icon: Gauge },
  ];

  return <>
    <PageHeader
      eyebrow={t("page.dashboard.eyebrow")}
      title={t("page.dashboard.title")}
      description={t("page.dashboard.description")}
    />

    <section className="-mt-2 mb-7">
      <div className="flex flex-wrap gap-2">
        {quickActions.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/[.07] bg-white/[.025] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/15 hover:bg-white/[.045] hover:text-white">
          <Icon size={14} className="shrink-0 text-zinc-500" />
          <span>{label}</span>
        </Link>)}
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <Metric label={t("dashboard.upcomingShows")} value={upcomingEvents.length} />
      <Metric label={t("dashboard.activeTasks")} value={activeTasks.length} />
      <Metric label={t("dashboard.redZoneCount")} value={issues.length} accent={issues.length > 0} />
      <Metric label={t("dashboard.contentInProgress")} value={contentItems.length} />
      <Metric label={t("dashboard.epkCount")} value={epkCount} />
    </section>

    <section className="mt-8 space-y-7 xl:hidden">
      <DashboardPanel title={t("dashboard.upcomingShows")} href="/events">
        {upcomingEvents.slice(0, 5).map((event) => <ShowRow key={event.id} event={event} locale={profile.locale} openLabel={t("common.open")} />)}
        {!upcomingEvents.length && <PanelEmpty text={t("dashboard.emptyShows")} href="/events" label={t("dashboard.actionNewEvent")} />}
      </DashboardPanel>

      <DashboardPanel title={t("dashboard.tasks")} href="/tasks">
        {prioritizedTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} locale={profile.locale} openLabel={t("common.open")} />)}
        {!prioritizedTasks.length && <PanelEmpty text={t("dashboard.emptyTasks")} href="/tasks" label={t("nav.tasks")} />}
      </DashboardPanel>

      <DashboardPanel title={t("redZone.title")} tone="danger">
        {issues.slice(0, 5).map((issue) => <RedZoneRow key={issue.id} issue={issue} locale={profile.locale} />)}
        {!issues.length && <div className="p-6 text-center text-sm text-emerald-300">{t("redZone.empty")}</div>}
      </DashboardPanel>

      <DashboardPanel title={t("dashboard.contentPlan")} href="/content-calendar">
        {dashboardContent.map((item) => <ContentRow key={item.id} item={item} locale={profile.locale} />)}
        {!dashboardContent.length && <PanelEmpty text={t("dashboard.emptyContent")} href="/content-calendar" label={t("dashboard.actionContentCalendar")} />}
      </DashboardPanel>
    </section>

    <section className="mt-8 hidden gap-7 xl:grid xl:grid-cols-2">
      <div className="flex flex-col gap-7">
        <DashboardPanel title={t("dashboard.upcomingShows")} href="/events">
          {upcomingEvents.slice(0, 5).map((event) => <ShowRow key={event.id} event={event} locale={profile.locale} openLabel={t("common.open")} />)}
          {!upcomingEvents.length && <PanelEmpty text={t("dashboard.emptyShows")} href="/events" label={t("dashboard.actionNewEvent")} />}
        </DashboardPanel>

        <DashboardPanel title={t("redZone.title")} tone="danger">
          {issues.slice(0, 5).map((issue) => <RedZoneRow key={issue.id} issue={issue} locale={profile.locale} />)}
          {!issues.length && <div className="p-6 text-center text-sm text-emerald-300">{t("redZone.empty")}</div>}
        </DashboardPanel>
      </div>

      <div className="flex flex-col gap-7">
        <DashboardPanel title={t("dashboard.tasks")} href="/tasks">
          {prioritizedTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} locale={profile.locale} openLabel={t("common.open")} />)}
          {!prioritizedTasks.length && <PanelEmpty text={t("dashboard.emptyTasks")} href="/tasks" label={t("nav.tasks")} />}
        </DashboardPanel>

        <DashboardPanel title={t("dashboard.contentPlan")} href="/content-calendar">
          {dashboardContent.map((item) => <ContentRow key={item.id} item={item} locale={profile.locale} />)}
          {!dashboardContent.length && <PanelEmpty text={t("dashboard.emptyContent")} href="/content-calendar" label={t("dashboard.actionContentCalendar")} />}
        </DashboardPanel>
      </div>
    </section>
  </>;
}
