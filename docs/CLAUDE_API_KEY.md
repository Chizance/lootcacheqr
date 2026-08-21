# Configuring your Claude API key securely

This is the part worth being careful about, so here's the full picture before the steps.

## Where the key goes (and where it never goes)

```
Your phone (browser)  ──HTTPS──>  Supabase Edge Function  ──HTTPS──>  Anthropic API
   no API key here                  ANTHROPIC_API_KEY lives            key used here
   just your login session          here, server-side only             only
```

- The key lives in exactly **one place**: the Supabase Edge Function's server-side environment (set via `supabase secrets set`, shown below).
- Your React app — everything under `src/` — never imports, references, or receives the key. It only calls `supabase.functions.invoke('extract-items', ...)`, which hits the Edge Function over HTTPS. The Edge Function is the only thing that ever talks to Anthropic.
- Anyone opening your site's page source, browser dev tools, or the built JS bundle in `dist/` will find **zero trace of your Anthropic key** — because it was never sent to the browser in the first place.
- The key is also never committed to git. It's not in `.env` (that file only holds your public Supabase URL/anon key), and `supabase/functions/.env` — used only for local testing — is explicitly listed in `.gitignore`.

## Step 1: Get your API key from Anthropic

1. Go to the [Anthropic Console](https://console.anthropic.com) and sign in (or create an account).
2. Go to **API Keys** and create a new key.
3. Copy it immediately — Anthropic only shows it once. It looks like `sk-ant-api03-...`.
4. You'll also want to check **Billing** and add a small amount of credit (a few dollars is plenty for personal use — recall from the earlier cost estimate, each box scan costs roughly 1 cent with Claude Sonnet 5).

Keep this key somewhere private for a minute (a password manager, or just your clipboard) — you're about to paste it into Supabase, not into this project's files.

## Step 2: Install the Supabase CLI

This is what deploys the Edge Function and sets its secret.

**Windows (PowerShell):** the Supabase CLI isn't available via winget — it's officially distributed through [Scoop](https://scoop.sh) instead. If you don't already have Scoop installed:
```powershell
irm get.scoop.sh | iex
```
Then install the Supabase CLI:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```
See the [Supabase CLI docs](https://supabase.com/docs/guides/cli/getting-started) if you'd rather use a different install method.

Restart your terminal after installing, then confirm it worked:
```
supabase --version
```

## Step 3: Log in and link this project

```
supabase login
```
This opens a browser window to authorize the CLI against your Supabase account.

```
supabase link --project-ref your-project-ref
```
Your project ref is in the Supabase dashboard URL: `https://supabase.com/dashboard/project/<this-part>`, or under **Project Settings > General**.

## Step 4: Set the key as a server-side secret

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

This stores the key inside Supabase's infrastructure, attached to your project. It is **not** written to any file in this repo. You can verify it's set (without revealing the value) with:
```
supabase secrets list
```

## Step 5: Deploy the Edge Function

```
supabase functions deploy extract-items
```

This uploads `supabase/functions/extract-items/index.ts` to Supabase. That function reads `ANTHROPIC_API_KEY` from the secret you just set (`Deno.env.get('ANTHROPIC_API_KEY')` — see the code) and uses it to call Claude.

The function also requires the caller to be logged in (Supabase verifies your app's session automatically before running it — this is the default, and the function is deployed without disabling that check). So even someone who found your Supabase project URL couldn't trigger Claude calls on your bill without valid account credentials.

## Confirming it's never exposed

After deploying, you can double-check yourself:

- **In the repo:** `git grep -i "sk-ant"` (PowerShell) — or `grep -r "sk-ant" . --exclude-dir=.git` on macOS/Linux — should find nothing. This only searches files git actually tracks, which is exactly what matters: `.env`, `.env.local`, and `supabase/functions/**/.env` are all gitignored, so even if a key were sitting in one of those locally, this command (and a real commit) would never see it.
- **In the browser:** open your deployed site, open DevTools > Network tab, tap "Scan box", and inspect the request to `.../functions/v1/extract-items`. You'll see your photo going out and JSON coming back — no Anthropic key anywhere in the request or response.
- **In the built bundle:** after `npm run build`, run `Get-ChildItem -Recurse -File dist | Select-String -Pattern "sk-ant"` (PowerShell) — or `grep -r "sk-ant" dist/` on macOS/Linux — which should find nothing, because the key was never part of the frontend build in the first place.

## Tracking cost

Every response from the Edge Function includes `estimated_cost_usd` for that specific call, computed from the actual token usage Claude reports — you'll see it in the app right after each scan. Check your running total anytime in the [Anthropic Console under Usage](https://console.anthropic.com/settings/usage).
