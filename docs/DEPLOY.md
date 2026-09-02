# Deploy — production & preview

Headless Nuxt static site: **production** on [weblaba.ru](https://weblaba.ru), **preview** on [GitHub Pages](https://proto0654.github.io/molecula-nuxt/), **WordPress CMS** on [api.weblaba.ru](https://api.weblaba.ru).

## Architecture

```
push main
  ├─ deploy-production.yml  →  rsync  →  ~/www/weblaba.ru/     (indexable)
  └─ deploy.yml           →  Pages  →  github.io/molecula-nuxt  (noindex)
                                              │
                                              └─ WP API ──► api.weblaba.ru/wp-json
```

| Target | Workflow | `NUXT_APP_BASE_URL` | `NUXT_PUBLIC_SITE_URL` | `NUXT_PUBLIC_WP_API_BASE` | `NUXT_PUBLIC_INDEXABLE` |
|--------|----------|---------------------|------------------------|---------------------------|-------------------------|
| Production | [deploy-production.yml](../.github/workflows/deploy-production.yml) | `/` | `https://weblaba.ru` | `https://api.weblaba.ru/wp-json` | `true` |
| Preview | [deploy.yml](../.github/workflows/deploy.yml) | `/molecula-nuxt/` | `https://proto0654.github.io/molecula-nuxt` | `https://api.weblaba.ru/wp-json` | `false` |

Media URLs come from WordPress as absolute `https://api.weblaba.ru/wp-content/...` — no rewrite in Nuxt.

---

## Part A — SSH key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-weblaba" -f ~/.ssh/weblaba_deploy
```

- **Private key** (`weblaba_deploy`) → GitHub Secret (see Part B).
- **Public key** (`weblaba_deploy.pub`) → REG.RU hosting.

### Add public key on REG.RU (ISPmanager)

1. Open **Shell-клиент** or SSH settings in the panel.
2. Add the public key to `~/.ssh/authorized_keys`, or use the panel’s **SSH keys** section if available.

### Verify SSH access

Replace `HOST` with the SSH hostname from REG.RU (panel → SSH access; may differ from internal `server199`):

```bash
ssh -i ~/.ssh/weblaba_deploy u1396397@HOST "ls ~/www/weblaba.ru"
```

You should see `index.html`, `_nuxt/`, etc. (or an empty folder before first deploy).

---

## Part B — GitHub Secrets

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | SSH hostname from REG.RU panel |
| `DEPLOY_USER` | `u1396397` (your hosting user) |
| `DEPLOY_SSH_KEY` | Full **private** key file (`-----BEGIN OPENSSH PRIVATE KEY-----` … `-----END OPENSSH PRIVATE KEY-----`). Not the `.pub` file. Copy from VS Code / Notepad — all lines, no extra spaces. |
| `DEPLOY_PATH` | `www/weblaba.ru/` (relative to home; confirm with `pwd` in shell inside `~/www/weblaba.ru`) |

`DEPLOY_PATH` must end with `/`. The workflow rsyncs **contents** of `.output/public/` into this directory with `--delete`.

---

## Part C — First production deploy

1. Commit and push workflows to `main` (or merge PR).
2. GitHub → **Actions** → **Production · weblaba.ru** — wait for green check.
3. Open [https://weblaba.ru](https://weblaba.ru):
   - Home + WebGL hero
   - `/portfolio` — archive loads
   - Open a case — images from `api.weblaba.ru/wp-content`
   - `/robots.txt` — `Allow: /` + `Sitemap: https://weblaba.ru/sitemap.xml`

Manual re-run: **Actions** → **Production · weblaba.ru** → **Run workflow** (no push required; secrets read at runtime).

---

## Part D — Two workflows on one push

Every push to `main` runs **both**:

| Workflow | Destination | Purpose |
|----------|-------------|---------|
| Preview · GitHub Pages | `proto0654.github.io/molecula-nuxt` | QA / share preview link |
| Production · weblaba.ru | `weblaba.ru` | Live site |

In the Actions list, runs are titled **Preview — GitHub Pages** vs **Production — weblaba.ru** (via `run-name`).

They build with different env vars; production does not affect Pages base path.

---

## Part E — Preview blocked from search engines

Preview sets `NUXT_PUBLIC_INDEXABLE=false`. Three layers:

1. **`robots.txt`** — `Disallow: /` (no `Sitemap` line)
2. **`<meta name="robots" content="noindex, nofollow">`** — global in `nuxt.config.ts` + per-page via `usePageSeo`
3. **`sitemap.xml`** — empty urlset (no URLs)

Verify after Pages deploy:

- [https://proto0654.github.io/molecula-nuxt/robots.txt](https://proto0654.github.io/molecula-nuxt/robots.txt) → `Disallow: /`
- View source on any page → `noindex, nofollow`
- Do **not** add the GitHub Pages URL to Google Search Console

Production (`NUXT_PUBLIC_INDEXABLE=true`) keeps normal `Allow: /`, full sitemap, canonical links.

---

## Part F — Local build

Copy [`.env.example`](../.env.example) to `.env` (optional):

```bash
npm ci
npm run generate
npm run preview
```

Production-equivalent:

```bash
NUXT_APP_BASE_URL=/ \
NUXT_PUBLIC_SITE_URL=https://weblaba.ru \
NUXT_PUBLIC_WP_API_BASE=https://api.weblaba.ru/wp-json \
NUXT_PUBLIC_INDEXABLE=true \
npm run generate
```

Preview-equivalent:

```bash
NUXT_APP_BASE_URL=/molecula-nuxt/ \
NUXT_PUBLIC_SITE_URL=https://proto0654.github.io/molecula-nuxt \
NUXT_PUBLIC_WP_API_BASE=https://api.weblaba.ru/wp-json \
NUXT_PUBLIC_INDEXABLE=false \
npm run generate
```

---

## Part G — Apache on REG.RU

[`public/.htaccess`](../public/.htaccess) is copied into the build output:

- 301 redirects for legacy `/wp-admin`, `/wp-json`, `/wp-content` → `api.weblaba.ru`
- SPA fallback to `index.html` for client-side routes

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Error loading key "(stdin)": error in libcrypto` | Re-create `DEPLOY_SSH_KEY` secret: paste private key again (entire file, Unix newlines). Verify locally: `ssh -i C:\Users\proto\.ssh\weblaba_deploy u1396397@HOST "echo ok"` |
| rsync `No such file or directory` | Fix `DEPLOY_PATH`; create folder in shell: `mkdir -p ~/www/weblaba.ru` |
| Build fails fetching slugs | `api.weblaba.ru/wp-json` must be reachable from GitHub runners (public HTTPS) |
| Images 404 on weblaba.ru | WP still serving old `weblaba.ru/wp-content` URLs — run `wp search-replace` on api |
| CORS errors in browser | WordPress must allow `Origin: https://weblaba.ru` (and preview origin if needed) |
| Production deploy runs before secrets set | Add all four secrets; re-run workflow |
| Old `_nuxt` hashes after deploy | Normal — `--delete` removes stale assets; hard-refresh browser |

---

## Related docs

- SEO / indexable flag: [SEO.md](SEO.md)
- WP content pipeline: [CONTENT.md](CONTENT.md)
- Env reference: [`.env.example`](../.env.example)
