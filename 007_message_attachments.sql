-- 007_message_attachments.sql
-- Mesajlara fotoğraf/video/dosya eki desteği.
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde çalıştırın.
-- (006_messages_schema.sql'i zaten çalıştırdıysan buna gerek var, o olmadan bu çalışmaz.)

-- 1) messages tablosuna ek kolonlar
alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.messages drop constraint if exists messages_attachment_type_valid;
alter table public.messages add constraint messages_attachment_type_valid
  check (attachment_type is null or attachment_type in ('image', 'video', 'file'));

-- Önceki kısıt "content boş olamaz" diyordu. Artık yalnızca ek dosyalı
-- (metinsiz) mesajlar da geçerli — kısıtı gevşetiyoruz: ya metin ya ek olsun.
alter table public.messages drop constraint if exists messages_content_not_blank;
alter table public.messages drop constraint if exists messages_content_or_attachment;
alter table public.messages add constraint messages_content_or_attachment
  check (char_length(btrim(content)) > 0 or attachment_url is not null);

-- 2) Storage bucket — avatars/goal-covers ile AYNI desen: herkese-açık
-- (public URL), ama yolun kendisi kullanıcı id'si + rastgele isim içerdiği
-- için tahmin edilemez. Sunucu tarafı boyut/tip sınırı burada, ayrıca
-- messages/send.js da savunma amaçlı ikinci kez kontrol ediyor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  20971520, -- 20 MB
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects üzerinde RLS zaten Supabase projelerinde varsayılan açık
-- gelir; burada tekrar açmak zararsız/idempotent — emin olmak için yazıyoruz.
alter table storage.objects enable row level security;

-- Kullanıcılar yalnızca KENDİ klasörlerine ({auth.uid()}/...) yükleme yapabilir.
drop policy if exists message_attachments_insert_own on storage.objects;
create policy message_attachments_insert_own on storage.objects
  for insert
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Kullanıcılar yalnızca kendi yükledikleri dosyayı silebilir (ileride "mesajı sil" eklenirse diye).
drop policy if exists message_attachments_delete_own on storage.objects;
create policy message_attachments_delete_own on storage.objects
  for delete
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
