import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { HTTPException } from 'hono/http-exception';
import { jstack } from 'jstack';
import type { NextApiRequest } from 'next';
import { getToken } from 'next-auth/jwt';
import * as schema from './db/schema';

interface Env {
  Bindings: {
    NODE_ENV: string;
    TURSO_CONNECTION_URL: string;
    TURSO_AUTH_TOKEN: string;
    CLOUDFLARE_API_TOKEN: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    NEXT_PUBLIC_WRANGLER_URL: string;
    JWT_SECRET: string;
    FAUCET_PRIVATE_KEY: string;
    HUDDLE01_API_KEY: string;
    NEXT_PUBLIC_HUDDLE01_ROOM_ID: string;
  };
}

export const j = jstack.init<Env>();
/**
 * Type-safely injects database into all procedures
 *
 * @see https://jstack.app/docs/backend/middleware
 */
const databaseMiddleware = j.middleware(async ({ c, next }) => {
  const client = createClient({
    url: c.env.TURSO_CONNECTION_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  return await next({ db });
});

const authMiddleWare = j.middleware(async ({ c, next }) => {
  try {
    const authHeader = c.req.header('Authorization');
    const cookies = c.req.header('Cookie');

    if (!authHeader && !cookies) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const req = c.req.raw;
    const compatReq = {
      headers: Object.fromEntries(req.headers.entries()),
      cookies: Object.fromEntries(
        (req.headers.get('cookie') || '')
          .split(';')
          .map((cookie) => cookie.trim().split('='))
          .filter(([key]) => key),
      ),
      method: req.method,
      query: Object.fromEntries(new URL(req.url).searchParams),
      body: await req
        .clone()
        .json()
        .catch(() => ({})),
    } as NextApiRequest;

    const isSecureEnvironment = c.env.NODE_ENV === 'production';
    const token = await getToken({
      req: compatReq,
      secret: c.env.JWT_SECRET,
      secureCookie: isSecureEnvironment,
      cookieName: 'next-auth.session-token',
    });

    if (!token || !token.name) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }

    return await next({
      user: {
        id: token.sub,
        address: token.name,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Internal server error' });
  }
});

/**
 * Authenticated procedures
 */
export const authProcedure = j.procedure
  .use(databaseMiddleware)
  .use(authMiddleWare);

/**
 * Public (unauthenticated) procedures
 *
 * This is the base piece you use to build new queries and mutations on your API.
 */
export const publicProcedure = j.procedure.use(databaseMiddleware);
