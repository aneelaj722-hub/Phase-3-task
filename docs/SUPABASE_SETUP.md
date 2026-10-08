# Supabase Setup

The frontend uses Supabase Auth and the public Data API. It requires the database migration and the trusted `manage-staff` Edge Function described below. The browser must only receive the project's URL and public anon/publishable key.

## 1. Configure the frontend

Set these variables in the project-root `.env` file:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-or-publishable-key>
```

The legacy variable name `VITE_SUPABASE_ANON_KEY` is retained for compatibility; it accepts the current `sb_publishable_...` key or the legacy anon JWT. Never put a secret/service-role key in a `VITE_` variable. Restart Vite after changing `.env`.

## 2. Apply the database migration

Apply `supabase/migrations/20261004032600_academy_mvp.sql` to the intended development project. With the Supabase CLI installed and authenticated:

```powershell
supabase link --project-ref <project-ref>
supabase db push
```

Alternatively, run the migration once in the Supabase Dashboard SQL Editor. Do not run it against production until it has been reviewed and tested in development.

The migration creates the academy tables, integrity constraints, audit triggers, transactional attendance/payment functions, and role-based RLS policies. It does not copy any prior browser `localStorage` records into the database.

## 3. Bootstrap the first administrator

Create the first Auth user from **Authentication > Users** in the Supabase Dashboard. Then use the SQL Editor to create that user's trusted administrator profile, replacing the example email and name:

```sql
insert into public.staff_profiles (user_id, email, full_name, role, is_active)
select id, lower(email), 'Academy Administrator', 'administrator', true
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing;
```

Verify exactly one row was inserted before signing in. Do not expose a service-role or secret key to perform this bootstrap.

## 4. Deploy staff invitations

The staff management screen calls the privileged `manage-staff` Edge Function. Deploy it using the Supabase CLI:

```powershell
supabase functions deploy manage-staff
```

The function verifies the caller's active administrator profile before using the server-side service-role key to invite an Auth user and create the corresponding profile. Supabase provides `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime; do not copy it into `.env`, Vercel frontend variables, or browser code. Configure email delivery/SMTP in Supabase so staff invitations can be sent.

Staff email changes are intentionally rejected by the current staff screen; use a verified Supabase Auth email-change process instead. A staff member without an assigned profile cannot grant themselves a role.

## 5. Configure Auth URLs and deployment

In **Authentication > URL Configuration**, set the local development site URL and allowed redirect URLs. Add the deployed frontend URL separately for production. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel frontend environment variables for each deployment environment, then redeploy.

## Current workflow boundary

- Attendance batch saves and fee payment allocations run through database functions so their validation and writes are atomic.
- The app rejects payments that exceed the student's open fee-obligation balance.
- Payment reversal is intentionally unavailable until a reason-capturing, audited reversal workflow is approved and implemented.
- Existing local browser data is not automatically imported. Keep the browser profile until any required records have been exported and reviewed.
