import { en } from "./en";
import { ru, type TranslationKey } from "./ru";
import type { Locale } from "@/lib/types";

export { type TranslationKey };

export function translate(locale: Locale, key: TranslationKey) {
  return (locale === "en" ? en : ru)[key] ?? ru[key] ?? key;
}

export function translator(locale: Locale) {
  return (key: TranslationKey) => translate(locale, key);
}

export function translateEnum(locale: Locale, value: string, fallback?: string, context?: string) {
  const contextualKey = context ? `enum.${context}_${value}` as TranslationKey : null;
  if (contextualKey && contextualKey in ru) return translate(locale, contextualKey);
  const key = `enum.${value}` as TranslationKey;
  if (key in ru) return translate(locale, key);
  return fallback ?? value;
}

const literalEn: Record<string, string> = {
  "Новая запись": "New record",
  "Песня": "Song",
  "Задача": "Task",
  "Проект": "Project",
  "Концерт": "Event",
  "Репетиция": "Rehearsal",
  "Промо-материал": "Promo material",
  "Контакт": "Contact",
  "Финансовая запись": "Finance record",
  "Материал песни": "Song material",
  "Название": "Title",
  "Подзаголовок": "Subtitle",
  "Описание": "Description",
  "Статус": "Status",
  "Приоритет": "Priority",
  "Тип": "Type",
  "Дедлайн": "Deadline",
  "Срок": "Due date",
  "Ответственный": "Assignee",
  "Тональность": "Key",
  "Строй": "Tuning",
  "Размер": "Time signature",
  "Длительность, секунд": "Duration, seconds",
  "Версия аранжировки": "Arrangement version",
  "Текст песни": "Lyrics",
  "Заметки к концертной версии": "Live version notes",
  "Город": "City",
  "Площадка": "Venue",
  "Дата и время": "Date and time",
  "Билеты": "Tickets",
  "Событие VK": "VK event",
  "Место": "Location",
  "Цели": "Goals",
  "Заметки": "Notes",
  "Проблемы": "Problems",
  "Решения": "Decisions",
  "Следующие задачи": "Next tasks",
  "Платформа": "Platform",
  "Дата публикации": "Publication date",
  "Ссылка на медиа": "Media URL",
  "Ссылка на публикацию": "Publication URL",
  "Текст": "Text",
  "Имя или название": "Name",
  "Телефон": "Phone",
  "Социальная сеть": "Social URL",
  "Сайт": "Website",
  "Надёжность, 1–5": "Reliability, 1–5",
  "История работы": "Work history",
  "Категория": "Category",
  "Сумма": "Amount",
  "Валюта": "Currency",
  "Дата": "Date",
  "Версия": "Version",
  "Ссылка": "URL",
  "Управление": "Management",
  "Исполнение": "Execution",
  "Репертуар": "Repertoire",
  "Практика": "Practice",
  "Коммуникации": "Communications",
  "Сеть": "Network",
  "Учёт": "Accounting",
  "Система": "System",
  "Панель": "Dashboard",
  "Проекты": "Projects",
  "Задачи": "Tasks",
  "Песни": "Songs",
  "Концерты": "Events",
  "Репетиции": "Rehearsals",
  "Промо": "Promo",
  "Контакты": "Contacts",
  "Финансы": "Finance",
  "Настройки": "Settings",
  "Все инициативы группы: релизы, концерты, видео, запись и промо.": "All band initiatives: releases, shows, video, recording and promo.",
  "Ответственные, сроки и следующий конкретный шаг.": "Owners, deadlines and the next concrete action.",
  "Единая база версий, партий, нот и концертных материалов.": "One catalog for versions, parts, scores and live materials.",
  "Подготовка, логистика, техника и боевые листы.": "Preparation, logistics, technical files and battle sheets.",
  "Цели, проблемные места, решения и задачи после каждого прогона.": "Goals, problem areas, decisions and follow-up tasks after every run-through.",
  "Афиши, публикации, видео и пресс-материалы без смешивания с музыкальными файлами.": "Posters, publications, video and press materials kept separate from song files.",
  "Площадки, подрядчики, музыканты, промоутеры и история работы.": "Venues, contractors, musicians, promoters and work history.",
  "Простой операционный учёт по проектам и концертам.": "Simple operational accounting for projects and events.",
  "Идея": "Idea", "Демо": "Demo", "Аранжировка": "Arrangement", "Запись": "Recording",
  "Сведение": "Mixing", "Мастеринг": "Mastering", "Готово": "Done",
  "Готово к концерту": "Live ready", "Черновик": "Draft", "В работе": "In progress",
  "Ожидание": "Waiting", "Утверждено": "Approved", "К выполнению": "To do",
  "На проверке": "In review", "Низкий": "Low", "Обычный": "Normal",
  "Высокий": "High", "Критический": "Critical", "Запланирован": "Planned",
  "Анонсирован": "Announced", "Опубликовано": "Published",
  "Релиз": "Release", "Видео": "Video", "Мерч": "Merch",
  "Промо-кампания": "Promo campaign", "Оркестровка": "Orchestration",
  "Афиша": "Poster", "Тизер": "Teaser", "Пресс-релиз": "Press release",
  "Пост VK": "VK post", "Пост Telegram": "Telegram post", "История": "Story",
  "Баннер": "Banner", "Другое": "Other",
  "Звукорежиссёр": "Sound engineer", "Художник по свету": "Lighting engineer",
  "Фотограф": "Photographer", "Видеограф": "Videographer", "Дизайнер": "Designer",
  "Журналист": "Journalist", "СМИ": "Media", "Промоутер": "Promoter",
  "Организатор": "Organizer", "Сессионный музыкант": "Session musician",
  "Оркестр": "Orchestra", "Хор": "Choir", "Менеджер": "Manager",
  "Пока нет данных.": "No data yet.",
  "Цели пока не указаны": "Goals not specified",
  "место не указано": "location not specified",
  "платформа не указана": "platform not specified",
  "город не указан": "city not specified",
  "контакт не указан": "contact not specified",
  "Без оценки": "Not rated",
  "Доход": "Income",
  "Расход": "Expense",
  "Доходы": "Income",
  "Расходы": "Expenses",
  "Остаток": "Balance",
  "Яндекс Музыка": "Yandex Music",
};

export function translateLiteral(locale: Locale, value: string) {
  const canonical: Record<string, [string, string]> = {
    concert: ["Концерт", "Event"], release: ["Релиз", "Release"], song: ["Песня", "Song"],
    video: ["Видео", "Video"], merch: ["Мерч", "Merch"], rehearsal: ["Репетиция", "Rehearsal"],
    promo_campaign: ["Промо-кампания", "Promo campaign"], orchestration: ["Оркестровка", "Orchestration"],
    recording: ["Запись", "Recording"], mixing: ["Сведение", "Mixing"], mastering: ["Мастеринг", "Mastering"],
    poster: ["Афиша", "Poster"], teaser: ["Тизер", "Teaser"], press_release: ["Пресс-релиз", "Press release"],
    vk_post: ["Пост VK", "VK post"], telegram_post: ["Пост Telegram", "Telegram post"],
    venue: ["Площадка", "Venue"], sound_engineer: ["Звукорежиссёр", "Sound engineer"],
    light_engineer: ["Художник по свету", "Lighting engineer"], photographer: ["Фотограф", "Photographer"],
    videographer: ["Видеограф", "Videographer"], session_musician: ["Сессионный музыкант", "Session musician"],
    income: ["Доход", "Income"], expense: ["Расход", "Expense"],
    guitar_tabs: ["Гитарные табулатуры", "Guitar tabs"], bass_tabs: ["Басовые табулатуры", "Bass tabs"],
    orchestral_score: ["Оркестровая партитура", "Orchestral score"], orchestral_parts: ["Партии оркестра", "Orchestral parts"],
    click_track: ["Клик", "Click track"], backing_track: ["Плейбек", "Backing track"],
    reaper_project: ["Проект Reaper", "Reaper project"], logic_project: ["Проект Logic", "Logic project"],
    admin: ["Администратор", "Administrator"], member: ["Участник", "Member"],
    guest: ["Гость", "Guest"], manager: ["Менеджер", "Manager"], pr: ["PR", "PR"],
  };
  const pair = canonical[value];
  if (pair) return locale === "en" ? pair[1] : pair[0];
  return locale === "en" ? literalEn[value] ?? value : value;
}
