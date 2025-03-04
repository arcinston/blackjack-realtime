'use server';

import { env } from '@/env.mjs';

export const createRoom = async () => {
  const response = await fetch(
    'https://api.huddle01.com/api/v2/sdk/rooms/create-room',
    {
      method: 'POST',
      body: JSON.stringify({
        title: 'Huddle01 Room',
      }),
      headers: {
        'Content-type': 'application/json',
        'x-api-key': env.HUDDLE01_API_KEY,
      },
      cache: 'no-cache',
    },
  );

  const data: { data: { roomId: string } } = await response.json();
  const roomId = data.data.roomId;
  console.log('roomId', roomId);
  return roomId;
};
