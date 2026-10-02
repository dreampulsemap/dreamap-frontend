-- Salt okunur raporlar. Supabase SQL editoründe calistir.

-- 1) Ozellik kullanimi: toplam ve son 30 gun (satir / farkli kullanici)
with act as (
  select 'dreams' f, user_id u, created_at t from dreams
  union all select 'comments', user_id, created_at from comments
  union all select 'likes', user_id, created_at from likes
  union all select 'goals', user_id, created_at from goals
  union all select 'goal_comments', user_id, created_at from goal_comments
  union all select 'goal_reactions', sender_id, created_at from goal_reactions
  union all select 'daily_seeds', user_id, created_at from daily_seeds
  union all select 'deep_analyses', user_id, created_at from deep_analyses
  union all select 'diary_entries', user_id, created_at from diary_entries
  union all select 'messages', sender_id, created_at from messages
  union all select 'mental_wall', user_id, created_at from mental_wall_reports
  union all select 'summaries', user_id, created_at from user_period_summaries
  union all select 'friendships', user_id, created_at from friendships
)
select f, count(*) rows_all, count(distinct u) users_all,
  count(*) filter (where t > now() - interval '30 days') rows_30d,
  count(distinct u) filter (where t > now() - interval '30 days') users_30d
from act group by f order by users_30d desc, rows_all desc;

-- 2) Aylik kohort: kayit, aktivasyon (ilk ruya), D1/D7 donus. Misafirler ayri.
with act as (
  select user_id u, created_at t from dreams union all select user_id, created_at from comments
  union all select user_id, created_at from likes union all select user_id, created_at from goals
  union all select user_id, created_at from diary_entries union all select sender_id, created_at from messages
  union all select user_id, created_at from daily_seeds union all select user_id, created_at from goal_comments
)
select date_trunc('month', s.created_at)::date ay, coalesce(s.is_anonymous, false) misafir, count(*) kayit,
  count(*) filter (where exists (select 1 from dreams d where d.user_id = s.id)) ruya_yazan,
  count(*) filter (where exists (select 1 from act where u = s.id and t >= s.created_at + interval '1 day' and t < s.created_at + interval '2 day')) d1,
  count(*) filter (where exists (select 1 from act where u = s.id and t >= s.created_at + interval '7 day' and t < s.created_at + interval '8 day')) d7
from auth.users s group by 1, 2 order by 1, 2;
