import { env } from '@/env.mjs';
import {
  type SIWESession,
  getAddressFromMessage,
  getChainIdFromMessage,
  verifySignature,
} from '@reown/appkit-siwe';
import NextAuth from 'next-auth';
import credentialsProvider from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session extends SIWESession {
    address: string;
    chainId: number;
  }
}

const nextAuthSecret = env.JWT_SECRET;
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is not set');
}

const projectId = env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not set');
}

const providers = [
  credentialsProvider({
    name: 'Ethereum',
    credentials: {
      message: {
        label: 'Message',
        type: 'text',
        placeholder: '0x0',
      },
      signature: {
        label: 'Signature',
        type: 'text',
        placeholder: '0x0',
      },
    },
    async authorize(credentials) {
      try {
        if (!credentials?.message) {
          throw new Error('SiweMessage is undefined');
        }
        const { message, signature } = credentials;
        const address = getAddressFromMessage(message);
        const chainId = getChainIdFromMessage(message);

        const isValid = await verifySignature({
          address,
          message,
          signature,
          chainId,
          projectId,
        });

        if (isValid) {
          return {
            id: `${chainId}:${address}`,
            name: address,
          };
        }

        return null;
      } catch (e) {
        console.error('Error in credentialsProvider', e);

        return null;
      }
    },
  }),
];

const handler = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  secret: nextAuthSecret,
  providers,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        domain: env.NODE_ENV === 'production' ? '.arcy.in' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        domain: env.NODE_ENV === 'production' ? '.arcy.in' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        domain: env.NODE_ENV === 'production' ? '.arcy.in' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },
    state: {
      name: 'next-auth.state',
      options: {
        domain: env.NODE_ENV === 'production' ? '.arcy.in' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    session({ session, token }) {
      if (!token.sub) {
        return session;
      }

      const [, chainId, address] = token.sub.split(':');
      if (chainId && address) {
        session.address = address;
        session.chainId = Number.parseInt(chainId, 10);
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
