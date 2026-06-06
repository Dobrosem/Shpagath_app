-- Create Auth users in Supabase Dashboard first, then promote one profile:
-- update public.profiles set role = 'admin' where email = 'admin@saphath.ru';

insert into public.projects (title,type,description,status,priority,deadline) values
('Альбом «Ascension»','release','Запись и выпуск полноформатного альбома','in_progress','critical','2026-09-18'),
('Saphath · Москва','concert','Большой концерт в клубе URBAN','in_progress','high','2026-07-24'),
('Клип «The Last Light»','video','Съёмка и постпродакшн','waiting','normal','2026-08-10');

insert into public.songs (title,subtitle,status,bpm,key,tuning,time_signature,duration,arrangement_version) values
('The Last Light','Ascension · Track 03','mixing',128,'Dm','Drop C','4/4',326,'v7.2'),
('Through the Ashes','Ascension · Track 01','live_ready',142,'Em','Drop C','4/4',281,'v5.0 live'),
('Cold Horizon','Ascension · Track 05','recording',96,'Cm','Drop B','6/8',374,'v3.4'),
('Ritual','Live repertoire','ready',118,'F#m','Drop C','4/4',302,'v4.1');

insert into public.events (title,city,venue,starts_at,call_time,soundcheck_time,performance_time,status) values
('Saphath · Москва','Москва','URBAN','2026-07-24 20:00:00+03','15:00','17:00','20:30','announced'),
('Metal Over Russia','Санкт-Петербург','А2','2026-08-15 19:00:00+03','14:00','16:00','21:10','planned'),
('Saphath · Нижний Новгород','Нижний Новгород','MILO','2026-09-05 19:30:00+03',null,null,null,'planned');

-- Checklist templates are intentionally regular rows so teams can duplicate/edit them.
insert into public.checklists (title,type) values ('Шаблон: Концерт','template_concert'), ('Шаблон: Релиз','template_release'), ('Шаблон: Репетиция','template_rehearsal');

with templates as (select id,type from public.checklists where type like 'template_%')
insert into public.checklist_items (checklist_id,title,order_index)
select t.id, x.title, x.ord from templates t cross join lateral (
  select * from unnest(
    case t.type
      when 'template_concert' then array['Афиша готова','Билеты заведены','Ссылки опубликованы','Событие VK создано','Посты запланированы','Сетлист утверждён','Плейбек проверен','Клик готов','Голосовые команды готовы','Райдер отправлен','Stage plot отправлен','Световой тайминг готов','Видео/интро проверены','Бэклайн подтверждён','Мерч подготовлен','Фотограф/видеограф подтверждён','Транспорт подтверждён','Финальная проверка в день концерта']
      when 'template_release' then array['Мастер готов','Обложка готова','Текст проверен','Описание для VK готово','Описание для Telegram готово','Описание для Яндекс Музыки готово','Сниппеты/Reels/Shorts готовы','Пост-релизный план готов','Рассылка СМИ/пабликам готова','Ссылки собраны','Публикации проверены']
      else array['Список песен утверждён','Партии выучены','Табулатуры проверены','Ноты проверены','Темпы проверены','Плейбеки обновлены','Проблемные места отмечены','Задачи после репетиции созданы']
    end
  ) with ordinality as u(title,ord)
) x;
