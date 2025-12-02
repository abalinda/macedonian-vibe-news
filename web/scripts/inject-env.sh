#!/bin/bash
# Script to inject Cloudflare Pages environment variables into .env.local for build time
# This ensures env vars are available during Next.js build even when Cloudflare doesn't pass them directly

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Warning: NEXT_PUBLIC_SUPABASE_URL not set in Cloudflare Pages environment"
else
  echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" >> "$PWD/.env.local"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY not set in Cloudflare Pages environment"
else
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" >> "$PWD/.env.local"
fi

# Debug: show what we got
echo "Current env vars in build:"
env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC vars found"
