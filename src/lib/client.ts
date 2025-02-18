import { env } from '@/env.mjs';
import type { AppRouter } from '@/server';
import { createClient } from 'jstack';
/**
 * Your type-safe API client
 * @see https://jstack.app/docs/backend/api-client
 */
export const client = createClient<AppRouter>({
  baseUrl: `${env.NEXT_PUBLIC_WRANGLER_URL}/api`,
});
