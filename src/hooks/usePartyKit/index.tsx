'use client';
import {
  generateRandomString,
  setPartyKitAtom,
  staticIdAtom,
} from '@/atoms/atom';

import { userAtom } from '@/atoms/user.atom';
import { env } from '@/env.mjs';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { usePartySocket } from 'partysocket/react';
import { useEffect } from 'react';
import type { TPartyKitServerMessage } from '../../../party';
import { useBlackjackHandler } from './blackjack.handler';
import { useChatHandler } from './chat.handler';
import { useCursorHandler } from './cursor.handler';
import { useDefaultHandler } from './default.handler';

export const usePartyKit = () => {
  const user = useAtomValue(userAtom);
  const setPartyKit = useSetAtom(setPartyKitAtom);
  const [staticId, setStaticId] = useAtom(staticIdAtom);

  if (staticId === '') {
    const randStr = generateRandomString(10);
    setStaticId(randStr);
  }

  const { cursorHandler } = useCursorHandler();
  const { blackjackHandler } = useBlackjackHandler();
  const { chatHandler } = useChatHandler();
  const { defaultHandler } = useDefaultHandler();

  const partyKit = usePartySocket({
    host: env.NEXT_PUBLIC_PARTYKIT_HOST,
    room: 'blackjack',
    query: { token: user.wsToken, walletAddress: user.walletAddress, staticId },
    onOpen: () => {
      console.log('Connected to GameServer', user.walletAddress);
      setPartyKit(partyKit);
    },
    onMessage: (event) => {
      const message = JSON.parse(
        event.data as string,
      ) as TPartyKitServerMessage;

      const { room } = message;

      if (room === 'cursor') {
        cursorHandler(message);
      } else if (room === 'blackjack') {
        blackjackHandler(message);
      } else if (room === 'chat') {
        chatHandler(message);
      } else if (room === 'default') {
        defaultHandler(message);
      }
    },
    onClose: () => {
      console.log('Disconnected from PartyKit');
      partyKit.close();
    },
    onError: () => {},
  });
  // Clean up on unmount
  useEffect(() => {
    return () => {
      partyKit.close();
    };
  }, [partyKit]);

  return {
    readyState: partyKit.readyState,
  };
};
