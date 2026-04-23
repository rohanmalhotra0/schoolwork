# Deploying rohan.lab to Vercel

Static site + one serverless function (`/api/chat`). The OpenAI key lives **only** in Vercel env vars — never in the browser, never in git.

---

## 0. Rotate the leaked key first

The key you pasted in chat earlier is compromised. Before anything else:

1. Go to <https://platform.openai.com/api-keys>
2. Click **Revoke** on the old key
3. Create a fresh one (project-scoped if possible)
4. Keep it in your password manager — that's the only copy that should exist outside Vercel

---

## 1. Local dev (recommended before deploying)

```bash
# in the repo root
npm install                       # installs openai SDK
npm install -g vercel             # one-time, for `vercel dev`

cp .env.local.example .env.local  # then edit .env.local and paste your NEW key
vercel dev                        # serves the site + /api/chat on http://localhost:3000
```

`.env.local` is gitignored — it will never be committed.

Visit <http://localhost:3000/Consulting/> — the floating **AI** button appears bottom-right. The full-page view is at <http://localhost:3000/chat.html>.

---

## 2. Deploy to Vercel

### Option A — GitHub integration (recommended)

1. Push this branch to GitHub (already done → `rohanmalhotra0/lab`).
2. Go to <https://vercel.com/new>, import `rohanmalhotra0/lab`.
3. Framework preset: **Other** (it's static + functions; no build step).
4. **Environment Variables** — add these for Production, Preview, and Development:
   - `OPENAI_KEY` = your new key
   - `OPENAI_MODEL` = `gpt-4o-mini` *(optional, defaults to this)*
5. Click **Deploy**.

### Option B — Vercel CLI

```bash
vercel login
vercel                 # first deploy → preview URL
vercel --prod          # promote to production

# set env vars via CLI instead of dashboard if you prefer
vercel env add OPENAI_KEY
```

---

## 3. How the pieces fit

| file | purpose |
| :-- | :-- |
| `api/chat.js` | Serverless endpoint. Takes `{ tab, messages, mode, focus }`, injects a tab-specific system prompt, streams OpenAI's reply back over SSE. |
| `api/_content.js` | Reads the client-side `Consulting/content.js` (and others) in a sandbox so the server has the same material the student is studying — no duplication. |
| `assets/chat-widget.js` | Floating AI button + popup. Also exposes `window.ChatLab` (store + API client) so the full page reuses it. |
| `assets/chat-widget.css` | Widget + shared message/input styles. |
| `assets/chat-page.js` | `/chat.html` controller. Sidebar of sessions by recency, tab picker, main conversation pane. |
| `assets/chat-page.css` | Full-page layout. |
| `chat.html` | Claude-style split view. Deep-linkable: `/chat.html?tab=consulting&s=<sessionId>`. |
| `vercel.json` | Tells Vercel to bundle each tab's `content.js` alongside the function, and sets the function's max duration to 60s. |

Sessions persist in the browser's `localStorage`. Widget and full page read/write the same keys and stay in sync via the `storage` event.

---

## 4. Modes

Every session has a mode — the mode is injected into the system prompt:

- **chat** — concise study partner
- **quiz me** — one question at a time, grades answers, keeps a running score
- **explain** — rigorous definition → intuition → example → traps, for a single term/formula
- **mock** — runs a full case interview (prompt → framework → math → brainstorm → recommendation), gives feedback per block, ends with a 3-dimension grade

Switch modes via the pill bar in either the widget or the full page.

---

## 5. Costs + safety knobs

- Default model is `gpt-4o-mini` — cheap, fast. Override via `OPENAI_MODEL` env var.
- Messages are trimmed to the last 30 turns and each message is capped at 8 KB before being sent.
- Function max duration is 60s (set in `vercel.json`).
- API key never touches the browser; every chat round-trips through `/api/chat`.
- Set per-project usage limits in OpenAI dashboard as a backstop.

---

## 6. Troubleshooting

**`server misconfigured: OPENAI_KEY not set`** — env var isn't on the Vercel project. Add it in Project Settings → Environment Variables, then redeploy.

**Widget doesn't appear** — check the browser console. The widget expects `/assets/chat-widget.js` to be reachable at the absolute path. If you deploy under a subpath, change the `<script src="…">` tags in each tab's `index.html`.

**AI answers feel generic in a tab** — the server can only ground the answer if `Consulting/content.js` (or equivalent) is bundled. `vercel.json` already lists the files; if you add a new tab, add its path to `functions["api/chat.js"].includeFiles`.

**Sessions disappeared** — `localStorage` is per-origin. Opening the site on a different domain or in incognito gives you a fresh store.
