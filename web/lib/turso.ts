import { createClient } from '@libsql/client/web'; // Import from /web for Next.js Edge support

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});