-- 019: goal_collaborators — davetli yalnızca kendi davetinin durumunu değiştirebilsin.
--
-- AÇIK: goal_collaborators_update_own politikası yalnızca user_id = auth.uid()
-- kontrol ediyordu ve authenticated rolünün TÜM kolonlarda UPDATE yetkisi
-- vardı. Bir kullanıcı kendi vizyonuna kendini "davet edip" (insert politikası
-- buna izin veriyor) satırın goal_id'sini başkasının gizli vizyonuna çevirip
-- status='accepted' yaparak goals_select_visible / goal_comments_select_visible
-- üzerinden o vizyonu ve yorumlarını okuyabiliyordu.
--
-- DÜZELTME: UPDATE yetkisi yalnızca status ve responded_at kolonlarına;
-- status yalnızca accepted/declined'e çekilebilir (pending'e geri dönüş yok).
-- Android (VisionRepository.respondToCollaboratorInvite) ve web yalnızca bu iki
-- kolonu yazıyor.

revoke update on public.goal_collaborators from authenticated, anon;
grant update (status, responded_at) on public.goal_collaborators to authenticated;

drop policy if exists goal_collaborators_update_own on public.goal_collaborators;
create policy goal_collaborators_update_own on public.goal_collaborators
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status in ('accepted', 'declined'));
