-- WaveSign admin — image storage bucket
--
-- Public read (images are shown on the public site), writes restricted to admins.
-- Files are stored as optimized WebP/JPEG/PNG; the 5 MB limit is enforced by the
-- bucket and again in the browser before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service-images public read"   on storage.objects;
drop policy if exists "service-images admin insert"  on storage.objects;
drop policy if exists "service-images admin update"  on storage.objects;
drop policy if exists "service-images admin delete"  on storage.objects;

create policy "service-images public read" on storage.objects
  for select using (bucket_id = 'service-images');

create policy "service-images admin insert" on storage.objects
  for insert with check (bucket_id = 'service-images' and public.is_admin());

create policy "service-images admin update" on storage.objects
  for update using (bucket_id = 'service-images' and public.is_admin())
  with check (bucket_id = 'service-images' and public.is_admin());

create policy "service-images admin delete" on storage.objects
  for delete using (bucket_id = 'service-images' and public.is_admin());
