-- Payment proof uploads must come only from the trusted Vercel server path.
-- Customers keep no direct INSERT/UPDATE/DELETE permission on the private bucket.

drop policy if exists "payment proof own insert" on storage.objects;
