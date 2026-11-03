# Margin

A calm hub for a student's school life: assignments, classes, calendar, projects, exams, study plans and clubs.
React + TypeScript + Vite, with Supabase Auth and Postgres (row-level security) for accounts and storage.

## Run it

```bash
npm install
cp .env.example .env     # then fill in the two public values
npm run dev
```

### Supabase setup (real accounts)
1. Create a Supabase project. In **Project Settings → API** copy the project URL and the anon/publishable key into `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never put a `service_role` key in any `VITE_` variable.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`). It creates the tables and enables
   row-level security so each student can only read and write their own rows.
3. In **Authentication → URL Configuration** add your site URL and `<site>/reset` as redirect URLs (password recovery).
   Optionally turn off "Confirm email" for local development.

Without these values the app shows a setup notice and offers a **local demo mode**: no account, no security, data stays in this browser's `localStorage`. It is labelled as such throughout.

## How it works
- One source of truth per record type (`courses`, `assignments`, `exams`, `projects`, `clubs`, `events`, `study_sessions`, `holidays`, `preferences`). Each Postgres row is `{id, user_id, data jsonb}`; relations are by id inside `data`.
- `src/lib/derive.ts` builds every calendar view (classes with A/B days and holidays, deadlines, exams, planned work, milestones, recurring club events) from those records, so an assignment looks the same on Today, Assignments, its Course, its Project and the Calendar.
- A **deadline** (the assignment) is stored separately from **planned work** (a `study_session`).
- Study suggestions use only upcoming exams, topics/effort you entered, and your weekday availability. Every suggestion explains why, and nothing is written until you accept it.
- Changes are optimistic; failures roll back with an error. Deletes and completions have Undo.

## Not implemented
- Google/iCal/school-system calendar sync. Reminders are in-app only (shown on Today); no email or push.
- Offline support, sharing, and real-time multi-device updates.

## Deploy to GitHub Pages
`.github/workflows/pages.yml` builds with `VITE_BASE=/<repo>/` and deploys on every push to `main`.
1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public values only).
3. Add `https://<user>.github.io/<repo>/` and `https://<user>.github.io/<repo>/reset` to Supabase **Authentication → URL Configuration**.
Without the variables the deployed site runs in local demo mode.
