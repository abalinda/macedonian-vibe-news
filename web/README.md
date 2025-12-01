This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Plan: Deploy Vibe + Scraper Online

Deploy the Next.js frontend to a serverless platform with edge caching, host the Python scraper on a managed cron service, secure all secrets, and push code to GitHub with CI automation. This gives you a fully autonomous news curation pipeline.

### Steps
1. Push project to GitHub; create `.gitignore` entries for `.env`, `logs/`, `venv/`, and `.next/`; remove hardcoded secrets from repo.
2. Deploy frontend to [Cloudflare Pages](https://pages.cloudflare.com) or [Vercel](https://vercel.com); set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as deployment secrets; verify ISR cache works.
3. Set up scraper automation using one of: [Render Cron Jobs](https://render.com/docs/cronjobs), [GitHub Actions scheduler](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#schedule), or [Fly.io Machines](https://fly.io/docs/machines/); inject `GEMINI_API_KEY` and `SUPABASE_KEY` as secure env vars.
4. Create a GitHub Actions CI workflow (or use platform native) to lint/build frontend on PR, run on main branch merge.
5. Fix typo in `scraper/requiriments.txt` → `requirements.txt`; update scheduler to use correct filename.
6. Test full pipeline: scraper runs, curates posts, locks featured slots; frontend redeploys and displays new hero stories.

### Further Considerations
1. **Secrets strategy**: Use platform secret management (Cloudflare Wrangler, Vercel env, Render secrets) instead of `.env` files—which should never be committed.
2. **Scraper scheduling**: GitHub Actions is free & simple (runs on shared runners); Render/Fly offers better performance but small cost.
3. **Frontend host preference**: Cloudflare Pages for raw speed & edge; Vercel for native Next.js DX.
4. **Monitoring**: Consider Sentry or native platform logs for error tracking and scraper health alerts.