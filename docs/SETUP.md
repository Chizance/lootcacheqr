# Setup guide

Everything you need to get LootcacheQR running: accounts, database, hosting, and your Claude API key. Do these roughly in order — later steps depend on earlier ones.

## What you'll end up with

- **GitHub** — hosts your code and serves the app for free via GitHub Pages.
- **Supabase** — free hosted Postgres database + auth + file storage + the serverless function that talks to Claude.
- **Anthropic** — the Claude API key that powers the optional "scan a box" feature.

None of this costs anything except the Claude API calls you explicitly trigger by tapping "Scan box" (a few tenths of a cent each — see [docs/CLAUDE_API_KEY.md](./CLAUDE_API_KEY.md)).

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub login is easiest).
2. Click **New project**. Pick any name (e.g. "storage-inventory"), generate/save a database password somewhere safe, pick a region near you, and create it. It takes a minute or two to provision.
3. Once it's ready, go to **Project Settings > Data API** (left sidebar, gear icon). Copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon public** key (NOT `service_role`) → this is `VITE_SUPABASE_ANON_KEY`

### Run the database schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) in this repo, copy the whole file, paste it into the SQL editor, and click **Run**.
4. This creates the `locations` and `bins` tables, turns on Row Level Security (so only signed-in users can read/write), and enables realtime sync.

### Create the photo storage bucket

1. Go to **Storage** (left sidebar) > **New bucket**.
2. Name it exactly `bin-photos`.
3. Leave **Public bucket** switched **off** — keep it private. The app accesses it through your logged-in session, not a public URL.
4. Create it. The storage access policies for this bucket were already created by `schema.sql` in the previous step (the bottom section of that file).

### Managing who can sign up

By default, the login screen's "Create account" link lets anyone self-register. Every logged-in account gets full read/write access to the shared inventory — there's no per-user restriction, which is intentional (see the RLS note below).

**If you want open self-signup** (easiest for sharing with friends): leave Supabase's default settings alone. Share your app URL and tell people to tap "Create account" on the login screen. They pick their own email and password and are in immediately.

**If you want to control exactly who has access**: disable self-signup and create accounts manually from the dashboard.

- Go to **Authentication > Providers > Email** and turn off **"Allow new users to sign up."** Save.
- Go to **Authentication > Users > Add user > Create new user**.
- Enter an email and password for each person, and check **"Auto Confirm User"** (skips the email confirmation step).
- Repeat for each person you want to add.

With signup disabled, the "Create account" link in the app will fail for anyone not already in your user list. To add someone later, just go back to **Authentication > Users** in the dashboard and create another account.

### A few more one-time security toggles

Two more quick wins in the dashboard, both flagged by Supabase's built-in security advisor (**Database > Security Advisor** — this list is worth revisiting occasionally):

- **"Leaked password protection"** — this one turns out to be a paid-plan-only feature on Supabase (not available on the free tier), so skip it. Not worth upgrading for on a personal 2-person app — just use a normal, non-trivial password for each account and this is a non-issue in practice.
- If you already ran `supabase/schema.sql` before this doc was updated, **re-run it** (SQL Editor, same as before — it's safe to run multiple times) to pick up a fix for a flagged database function that didn't pin its search path.

**About the "RLS Policy Always True" warning:** the advisor will also flag that `bins` and `locations` allow any signed-in user to read/write any row, with no per-user restriction. This one's intentional, not a bug — the whole point of this app is that everyone with an account shares one inventory. Supabase's linter is a generic scanner tuned for multi-tenant apps, where that pattern usually *is* a mistake; here, "any logged-in user has full access" is exactly the intended trust model, so it's safe to leave as-is. If you ever need to give someone view-only access, that's the point where this policy would need to become more restrictive.

---

## 2. Set up your Claude API key

Follow [docs/CLAUDE_API_KEY.md](./CLAUDE_API_KEY.md) now — it walks through getting the key from the Anthropic Console and installing the Supabase CLI to deploy the Edge Function that uses it. Come back here once that's done.

---

## 3. Configure local development

1. In this project folder, copy the example env file:
   ```
   cp .env.example .env
   ```
   (PowerShell: `Copy-Item .env.example .env`)
2. Open `.env` and paste in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.
3. Install dependencies and start the dev server:
   ```
   npm install
   npm run dev
   ```
4. Open the printed `localhost` URL. You should see the login screen — sign in with the account you already created (local dev and your deployed site share the exact same Supabase project, so there's nothing separate to set up here; one account works in both places).

`.env` is in `.gitignore` — it will never be committed. Only you (and anyone with local access to this folder) can see it.

---

## 4. Deploy to GitHub Pages

The repo already has a GitHub Actions workflow ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) that builds and deploys the app automatically every time you push to `main`. You just need to give it your Supabase values and turn on Pages once.

### Add your Supabase values as repo secrets

1. On GitHub, go to your repo > **Settings > Secrets and variables > Actions**.
2. Click **New repository secret** twice, adding:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
3. These are encrypted by GitHub and only readable by your own workflow runs — this is the standard, safe way to give a public repo's build process values that shouldn't be hardcoded in tracked files. (They're not secret in the sense of "must never be seen" — the anon key ends up in your built JS bundle either way, per the note in `.env.example` — but keeping them as repo secrets means you never have to hardcode them into a committed file.)

### Turn on GitHub Pages

1. Repo **Settings > Pages**.
2. Under **Build and deployment > Source**, choose **GitHub Actions**.
3. That's it — no branch to pick, the workflow handles building and publishing.

### Push and watch it deploy

Once you push your first commit (see [docs/GIT_WORKFLOW.md](./GIT_WORKFLOW.md)), go to the **Actions** tab on GitHub to watch the "Deploy to GitHub Pages" workflow run. When it finishes, your app is live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

Open that on your phone and **add it to your home screen** (Safari: Share > Add to Home Screen; Android Chrome: menu > Install app / Add to Home screen) — that's what makes it launch full-screen like a real app instead of opening in a browser tab.

---

## 5. Deploy the Claude photo-extraction function

This is covered in detail in [docs/CLAUDE_API_KEY.md](./CLAUDE_API_KEY.md), but in short:

```
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy extract-items
```

---

## Ongoing workflow

Day to day, you won't touch most of this again. When you want to change the app:

1. Edit code locally, test with `npm run dev`.
2. Commit and push (see [docs/GIT_WORKFLOW.md](./GIT_WORKFLOW.md)).
3. GitHub Actions rebuilds and redeploys automatically within a minute or two.

Database schema changes (if you ever add one) go through the Supabase SQL Editor the same way you ran `schema.sql`. Edge Function changes need a re-run of `supabase functions deploy extract-items`.
