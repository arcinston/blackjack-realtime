import { env } from '@/env.mjs';
import { jwtVerify } from 'jose';
import type * as Party from 'partykit/server';
import { unknown } from 'zod';
import z from 'zod';
import type { BlackjackRecord } from './blackjack/blackjack.types';
import { BlackjackRoom } from './blackjack/room';

import type { CursorRecord } from './cursor/cursor.types';
import { CursorRoom } from './cursor/room';

type UserId = `0x${string}` | 'guest';

const SocketMessageSchema = z.object({
  room: z.enum(['blackjack', 'cursor']),
  type: z.string(),
  data: z.object({}),
});

type ConnectionState = {
  userId: UserId;
  country: string | null;
};

type DefaultRecord = {
  'hello-world': { message: string };
};

// Define a mapping from room name to its Record type
type RoomRecordMap = {
  cursor: CursorRecord;
  blackjack: BlackjackRecord;
  default: DefaultRecord;
};

//  TPartyKitServerMessage - Attempt with direct lookup and conditional types
type TPartyKitServerMessage<
  TRoom extends keyof RoomRecordMap = keyof RoomRecordMap,
> = TRoom extends keyof RoomRecordMap
  ? // Conditional type based on TRoom
    { room: TRoom } & {
      // Intersection to add room property
      [TType in keyof RoomRecordMap[TRoom]]: // Mapped type over types for the given room
      { type: TType; data: RoomRecordMap[TRoom][TType] };
    }[keyof RoomRecordMap[TRoom]] // Index to distribute mapped type as union
  : never; // If TRoom is not a valid room, type is never

/*-------------------------------------------------------------------------
  Server Class
  This class implements Party.Server and wires up connections, requests,
  and in-room messages for our Blackjack game.
---------------------------------------------------------------------------*/
export default class Server implements Party.Server {
  private roomMap: { [id: string]: BlackjackRoom };
  private cursorRoom: CursorRoom;
  readonly room: Party.Room;

  constructor(room: Party.Room) {
    this.room = room;
    this.cursorRoom = new CursorRoom('cursors', this.room);
    this.roomMap = {
      main: new BlackjackRoom('main', this.room),
    };
  }

  static async onBeforeConnect(req: Party.Request, lobby: Party.Lobby) {
    try {
      const urlParams = new URL(req.url).searchParams;
      const token = urlParams.get('token');
      const walletAddress = urlParams.get('walletAddress')?.toLowerCase();

      if (!walletAddress) {
        req.headers.set('X-User-Id', 'guest');
        return req;
      }

      if (token) {
        try {
          console.log('Token received:', token);

          const secretKey = new TextEncoder().encode(env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secretKey);
          console.log({ payload });
          if (
            typeof payload === 'object' &&
            'walletAddress' in payload &&
            (payload.walletAddress as string).toLowerCase() === walletAddress
          ) {
            req.headers.set('X-User-Id', walletAddress);
            return req;
          }
        } catch (error) {
          console.warn('Invalid or expired token');
        }
      }

      return new Response('Unauthorized: Valid token required', {
        status: 401,
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return new Response('Authentication error', { status: 401 });
    }
  }

  async onConnect(
    conn: Party.Connection<ConnectionState>,
    { request }: Party.ConnectionContext,
  ) {
    try {
      const room = this.roomMap.main;
      if (!room) {
        throw new Error('Room not found');
      }

      let userId = request.headers.get('X-User-Id') as UserId | null;
      const country = (request.cf?.country ?? null) as string | null;

      if (!userId) {
        console.log('guest user');
        userId = 'guest';
      }

      console.log(`Connected: id: ${conn.id}, room: ${room.id}`);
      this.send(userId, {
        room: 'default',
        type: 'hello-world',
        data: { message: 'hello-from-server' },
      });

      conn.setState({ userId, country });
      // Join both rooms
      await room.onJoin(conn);
      await this.cursorRoom.onJoin(conn);

      console.log({ conn });
    } catch (err) {
      console.error(`Error joining room: ${err}`);
      conn.send(JSON.stringify({ type: 'error', message: err }));
      conn.close();
    }
  }

  send(id: string, message: TPartyKitServerMessage) {
    const connection = this.room.getConnection(id);
    if (!connection) return;
    connection.send(JSON.stringify(message));
  }

  broadcast(message: TPartyKitServerMessage, without?: string[]) {
    this.room.broadcast(JSON.stringify(message), without);
  }

  async onMessage(
    unknownMessage: string,
    conn: Party.Connection<ConnectionState>,
  ) {
    console.log(`Connection ${conn.id} sent message: ${unknown}`);
    try {
      const message = SocketMessageSchema.parse(unknownMessage);

      // Route cursor messages to cursor room
      if (message.room === 'cursor') {
        this.cursorRoom.handleMessage(conn, message).catch((err) => {
          console.error('Error handling cursor update:', err);
        });
        return;
      }

      // Route game messages to blackjack room
      const room = this.roomMap.main;
      if (!room) {
        throw new Error('Room not found');
      }
      const userId = conn.state?.userId;
      if (!userId) {
        throw new Error('No player address found');
      }

      if (userId === 'guest') {
        return;
      }

      room
        .onMessage(conn, message)
        .catch((err) => console.error('Error handling message in room:', err));
    } catch (err) {
      console.error('Failed to parse message as JSON', err);
    }
  }
}

// Ensure our server class satisfies Party.Worker.
Server satisfies Party.Worker;

export type { UserId, ConnectionState, TPartyKitServerMessage };
