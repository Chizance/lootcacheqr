# Get started

No coding required. You'll do everything through your web browser.

The only service you need to set up yourself is **Supabase** - it's where your bin data gets stored privately. After that, one button handles the rest.

---

## Part 1 - Set up Supabase (your private database)

Supabase is a free service that stores your data. Think of it like a private spreadsheet in the cloud that only your app can talk to.

### Create an account and project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**.
2. Sign up. The easiest way is with a Google account.
3. Click **New project** and fill in:
   - A name - anything you like, e.g. "my-inventory"
   - A database password - save this somewhere safe (a notes app is fine)
   - A region - pick the one closest to you
4. Click **Create new project** and wait about a minute for it to be ready.

### Copy your two keys

You'll need these in a moment.

1. Click the gear icon in the left sidebar, then click **Data API**.
2. Find and copy these two values - paste them into a notes app for now:
   - **Project URL** - looks like `https://something.supabase.co`
   - **anon public** key - a long string of letters and numbers. Make sure you grab the one labeled `anon public`, not `service_role`.

### Set up the database tables

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open a new browser tab and go to your copy of this repo on GitHub. Open the file `supabase/schema.sql`, then click the **Raw** button. Select all the text (Ctrl+A or Cmd+A) and copy it.
4. Go back to Supabase, click in the SQL editor box, paste the text, and click **Run**.
5. You should see a success message at the bottom.

### Create the photo storage area

1. In Supabase, click **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it exactly `bin-photos` (all lowercase, with a hyphen, no spaces).
4. Leave **Public bucket** switched **off**.
5. Click **Save**.

---

## Part 2 - Deploy the app

Click this button:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/chizance/lootcacheqr)

It will ask you to:

1. Connect a GitHub account - click **Connect to GitHub** and follow the prompts. GitHub hosts a copy of the code on your behalf. You can sign up for free if you don't have one.
2. Fill in two fields with the values you copied earlier:
   - `VITE_SUPABASE_URL` - paste your Project URL
   - `VITE_SUPABASE_ANON_KEY` - paste your anon public key
3. Click **Save & Deploy**.

Wait about two minutes. When it says "Published," your app is live at the URL Netlify gives you (something like `https://your-app-name.netlify.app`).

---

## Part 3 - Add it to your phone

Open your app URL in your phone's browser:

- **iPhone (Safari):** tap the Share button, then **Add to Home Screen**
- **Android (Chrome):** tap the three-dot menu, then **Install app** or **Add to Home screen**

This makes it open full-screen like a real app instead of in a browser tab.

---

## Part 4 - Create accounts

Open your app and tap **Create account** on the login screen. Anyone you share the URL with can do the same to get their own login.

If you'd rather approve each person individually, see "Managing who can sign up" in [docs/SETUP.md](./docs/SETUP.md).

---

## Optional - AI photo scanning

The "Scan box" button lets you photograph an open box and get an automatic list of its contents. This is powered by Claude AI and costs a small amount per scan (a few cents). It requires a bit more setup.

If you want it, follow [docs/CLAUDE_API_KEY.md](./docs/CLAUDE_API_KEY.md) after you've finished everything above.

---

## Something not working?

- **Deploy failed** - double-check your two Supabase values are correct. In Netlify, go to Site configuration > Environment variables to update them, then trigger a new deploy.
- **App loads but I can't sign in** - make sure you ran the full `schema.sql` file in Part 1. You can run it again without any harm.
- **I want to use GitHub Pages instead of Netlify** - see [docs/SETUP.md](./docs/SETUP.md) for the full manual setup walkthrough.
