# Part 27 Supabase Migration Apply Note

Migration file:

supabase/migrations/20260704000100_part27_admin_role_hardening.sql

## Why this matters

Before real paid users, normal authenticated users must not be able to update their own privilege or billing fields such as:

- role
- plan
- is_admin
- subscription_status
- billing_status
- trial_ends_at
- subscription_ends_at

## What the migration does

- Adds a trigger on public.profiles.
- Blocks client-side updates to privilege and billing fields.
- Allows trusted service_role backend/admin operations.
- Revokes column-level update privileges for anon/authenticated where those columns exist.

## Apply option

Use Supabase Dashboard SQL Editor:

1. Open Supabase dashboard.
2. Open SQL Editor.
3. Paste the migration SQL.
4. Run it.
5. Confirm success.

## Safety check after applying

Create a normal authenticated user and confirm they cannot update their own role or plan from the client.

Expected result:

- Normal profile fields can update if policies allow it.
- role / plan / admin / billing fields fail from client context.
