# Cloudflare Pages Deployment Guide

Complete instructions for deploying the Next.js frontend to Cloudflare Pages with automatic preview deployments.

## Why Cloudflare Pages?

- **Fast:** Global edge network with automatic image optimization
- **Free:** Generous free tier (unlimited deployments, preview builds)
- **GitHub Integration:** Auto-deploy on every push
- **Zero Config:** Next.js framework preset handles everything
- **Environment Variables:** Easy secret management
- **Analytics:** Built-in performance monitoring

## Prerequisites

- Cloudflare account (free: [cloudflare.com](https://cloudflare.com))
- GitHub account with [macedonian-vibe-news](https://github.com/abalinda/macedonian-vibe-news) repository
- Supabase credentials (URL and anon key)

## Deployment Steps

### 1. Create Cloudflare Pages Project

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click **Create a project** → **Connect to Git**
3. Authorize GitHub (click "Connect GitHub")
4. Select repository: `macedonian-vibe-news`
5. Authorize Cloudflare to access your GitHub account
6. You'll be redirected back to create project settings

### 2. Configure Build Settings

In the project configuration screen:

**Project name:** `macedonian-vibe-news` (or choose your preference)

**Production branch:** `main`

**Build settings:**
- **Framework preset:** Select `Next.js`
- **Build command:** `cd web && npm run build`
- **Build output directory:** `web/.next`
- **Root directory:** (leave empty)

Click **Save and Deploy**

### 3. Add Environment Variables

After initial deployment, you need to configure environment variables:

1. In Cloudflare Pages dashboard, click your project name
2. Go to **Settings** → **Environment variables**
3. Add variables for **Production** environment:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ0...` | Supabase Dashboard → Settings → API → anon public |

4. Click **Save and Deploy**

Cloudflare will automatically redeploy with the new variables.

### 4. Verify Deployment

After clicking "Save and Deploy":

1. Go to **Deployments** tab
2. Watch for the latest deployment with status **Active**
3. Click deployment to see build logs
4. Click the deployment URL to visit your live site

**Your site is now live at:** `https://macedonian-vibe-news.pages.dev`

---

## Features & Workflows

### Automatic Deployments

| Trigger | Behavior |
|---------|----------|
| Push to `main` | Deploys to production |
| Push to other branch | Creates preview deployment |
| Pull Request | Comments with preview URL |

### Preview Deployments (Optional)

Enable to get URLs for every branch/PR:

1. **Settings** → **Builds & deployments**
2. Toggle **Preview deployments** → `Enabled`
3. Now every PR gets automatic preview link

### Custom Domain (Optional)

If you own a domain:

1. **Custom domain** tab → **Setup a custom domain**
2. Enter your domain (e.g., `macedonian-news.com`)
3. Follow Cloudflare DNS instructions
4. Your site accessible at your domain + `pages.dev` subdomain

### Analytics

View performance metrics:

1. **Analytics** tab shows:
   - Page views over time
   - Most visited pages
   - Browser & device stats
   - Performance metrics

---

## Build Process

### What Happens During Deploy

```
1. GitHub webhook → Cloudflare (when you push)
   ↓
2. Cloudflare clones repository
   ↓
3. Runs build command: cd web && npm run build
   ├─ npm install (dependencies)
   ├─ Next.js build (web/.next/)
   └─ Lint checks (ESLint)
   ↓
4. Verifies output directory (web/.next/)
   ↓
5. Uploads to Cloudflare edge network
   ↓
6. Live! Site available globally in ~30 seconds
```

### Build Time

Typical build takes **2-3 minutes**:
- Dependencies download: ~30s
- Next.js build: ~60s
- Upload: ~15s

Check logs in **Deployments** tab if slow.

---

## Environment Variables Explained

### Public vs Private

**`NEXT_PUBLIC_*` Variables (Public, Safe)**
- Embedded in frontend JavaScript
- Visible in browser (no secrets)
- Use anon keys (read-only database access)

**Example:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Private Variables (Secret, Server-Only)**
- Not exposed to browser
- Only used in API routes (if any)
- Can use service role keys

**For this project:** All variables are public (`NEXT_PUBLIC_*`) since it's a static frontend with no server logic.

### Adding New Variables

To add more environment variables later:

1. **Settings** → **Environment variables**
2. **+ Add variable**
3. Name & value
4. **Save and Deploy**

Cloudflare will trigger a redeploy with new variables.

---

## Logs & Debugging

### View Build Logs

1. Go to **Deployments** tab
2. Click a deployment name
3. In right panel, click **View build log**
4. See real-time build output

**Look for:**
- ✅ `Build succeeded`
- ✅ `SUCCESS`
- ❌ Error messages if build fails

### Common Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `npm ERR! code ENOENT` | Missing file | Check `package.json` paths |
| `Build output not found` | Wrong output directory | Verify `.next` exists after build |
| `Cannot find module` | Missing dependency | Run `npm install` locally |
| `ESLint error` | Code style issue | Fix linting errors in IDE |

### View Runtime Errors

1. Open your deployed site
2. Press **F12** → **Console** tab
3. Look for red error messages
4. Fix in code and push to GitHub

---

## Performance Optimization

### Cloudflare Features

Cloudflare automatically provides:
- **Caching:** Static assets cached globally
- **Compression:** Gzip/Brotli compression
- **Minification:** CSS/JS minification
- **HTTP/3:** Latest protocol for speed

### Frontend Optimization

To improve further:

1. **Image Optimization:** Add Next.js Image component
   ```tsx
   import Image from 'next/image'
   ```

2. **Lazy Loading:** Images load as scrolled into view

3. **Code Splitting:** Next.js automatic (loaded as needed)

Check performance in:
- **Analytics** tab → performance metrics
- Chrome DevTools → Lighthouse
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Troubleshooting

### Site Returns 404

**Problem:** Deployed successfully but getting 404 errors

**Causes:**
1. Wrong build output directory
2. Missing environment variables
3. Frontend can't connect to Supabase

**Solution:**
1. Check **Deployments** → build logs
2. Verify `web/.next` directory created
3. Verify environment variables set correctly
4. Check browser console for errors (F12)

### Deployment Stuck/Hanging

**Problem:** Build stuck in progress for > 10 minutes

**Solution:**
1. Refresh page
2. Click **Retry** on deployment
3. If persists: check GitHub Actions for conflicts
4. Push a new commit to trigger fresh build

### Environment Variables Not Applied

**Problem:** Changed variable but site still shows old value

**Solution:**
1. Did you click **Save and Deploy**?
2. Cloudflare automatically redeploys after saving
3. Hard refresh browser (Cmd+Shift+R on Mac)
4. Clear browser cache
5. Wait 30s for edge network to update globally

### Preview Deployments Not Showing

**Problem:** PR doesn't get automatic preview URL

**Solution:**
1. Check **Settings** → **Builds & deployments** → Preview deployments enabled
2. Make sure you're on non-main branch
3. GitHub might need reauthorization

---

## Advanced Configuration

### Custom Build Script

If you need a custom build process, edit build command in **Settings** → **Builds & deployments**.

**Example:** Install dependencies first
```bash
npm ci && cd web && npm run build
```

### Redirect Rules

Route requests to specific pages:

1. **Settings** → **Redirects**
2. Add redirect rules
3. Example: `/about` → `/pages/about`

### Headers

Add security headers:

1. Create `web/_headers` file:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```

2. Commit and push
3. Cloudflare applies on next deploy

---

## Monitoring & Maintenance

### Monthly Checklist

- [ ] Check **Analytics** for traffic trends
- [ ] Review **Deployments** for any failed builds
- [ ] Test site at `macedonian-vibe-news.pages.dev`
- [ ] Verify Supabase connection works
- [ ] Check browser console (F12) for errors
- [ ] Monitor build times (should be < 5 min)

### Update Dependencies

Every month or when needed:

1. Locally: `npm update` in `web/` folder
2. Test: `npm run build && npm run dev`
3. Push to GitHub
4. Cloudflare auto-deploys
5. Verify build succeeds

### Logs Retention

Cloudflare keeps logs for **30 days**. To keep historical data:
- Take screenshots of metrics
- Export analytics reports
- Archive important build logs

---

## FAQ

**Q: Can I use a custom domain?**
A: Yes! Add in **Custom domain** tab. Requires Cloudflare to manage DNS.

**Q: What if I reach the free tier limits?**
A: Very high - 500 deployments/month, unlimited traffic. Unlikely to hit limits.

**Q: Can I revert to previous deployment?**
A: Go to **Deployments**, click any past deployment, click **Rollback**. Done!

**Q: Does Cloudflare cache bust automatically?**
A: Yes, Next.js creates unique filenames for each build (content-hashed).

**Q: How do I run GitHub Actions with Cloudflare?**
A: Frontend deploys via Cloudflare Pages (no GitHub Actions needed for frontend). Scraper runs on GitHub Actions separate.

**Q: Can I add API routes?**
A: Cloudflare Pages doesn't support Next.js API routes. Use Vercel or edge functions instead.

---

## Next Steps

1. ✅ Deploy to Cloudflare Pages (this guide)
2. ⏭️ Configure GitHub Actions secrets (see `GITHUB_ACTIONS_SECRETS.md`)
3. ⏭️ Test scraper execution and data flow
4. ⏭️ Set up monitoring and alerts

---

## Support & Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [GitHub Actions Secrets Guide](./GITHUB_ACTIONS_SECRETS.md)
- [Deployment Overview](./DEPLOYMENT.md)
