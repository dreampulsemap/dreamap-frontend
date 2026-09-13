-- Bug #13: Journal/Story (diary_entries) fotoğraf gönderilerinde yorum ve
-- beğeni özelliği hiç yoktu (backend'de hiçbir endpoint/tablo mevcut değildi).
-- Bu migration, "dreams" tablosundaki likes/comments için zaten kanıtlanmış
-- aynı deseni (basit auth.uid() tabanlı RLS + likes_count/comments_count
-- denormalize kolonları + trigger ile senkronizasyon) diary_entries için de
-- uyguluyor.

alter table diary_entries
  add column if not exists likes_count integer not null default 0,
  add column if not exists comments_count integer not null default 0;

create table if not exists diary_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  diary_entry_id uuid not null references diary_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, diary_entry_id)
);

create table if not exists diary_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  diary_entry_id uuid not null references diary_entries(id) on delete cascade,
  content text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists diary_likes_diary_entry_id_idx on diary_likes(diary_entry_id);
create index if not exists diary_comments_diary_entry_id_idx on diary_comments(diary_entry_id);

alter table diary_likes enable row level security;
alter table diary_comments enable row level security;

create policy diary_likes_select_public on diary_likes for select to public using (true);
create policy diary_likes_insert_own on diary_likes for insert to authenticated with check (auth.uid() = user_id);
create policy diary_likes_delete_own on diary_likes for delete to authenticated using (auth.uid() = user_id);

create policy diary_comments_select_public on diary_comments for select to public using (true);
create policy diary_comments_insert_own on diary_comments for insert to authenticated with check (auth.uid() = user_id);
create policy diary_comments_delete_own on diary_comments for delete to authenticated using (auth.uid() = user_id);

create or replace function update_diary_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_id uuid := coalesce(new.diary_entry_id, old.diary_entry_id);
begin
  if tg_op = 'INSERT' or tg_op = 'DELETE' then
    if tg_table_name = 'diary_likes' then
      update diary_entries
      set likes_count = (select count(*) from diary_likes where diary_entry_id = affected_id)
      where id = affected_id;
    elsif tg_table_name = 'diary_comments' then
      update diary_entries
      set comments_count = (select count(*) from diary_comments where diary_entry_id = affected_id)
      where id = affected_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_update_diary_likes_count on diary_likes;
create trigger trg_update_diary_likes_count
  after insert or delete on diary_likes
  for each row execute function update_diary_counts();

drop trigger if exists trg_update_diary_comments_count on diary_comments;
create trigger trg_update_diary_comments_count
  after insert or delete on diary_comments
  for each row execute function update_diary_counts();
