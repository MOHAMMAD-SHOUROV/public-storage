-- Run this in Supabase SQL Editor.
-- This keeps the media bucket private and lets each logged-in user
-- manage only files whose first folder is their own user ID.

create policy "Users can upload their own media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can read their own media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
