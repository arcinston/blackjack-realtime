// import { useSetAtom } from 'jotai';
import { addChatLogAtom, generateRandomId } from '@/atoms/chat.atom';
import { useSetAtom } from 'jotai';
import type { TPartyKitServerMessage } from '../../../party';
export const useChatHandler = () => {
  const chatHandler = (message: TPartyKitServerMessage) => {
    const addChatLog = useSetAtom(addChatLogAtom);
    const { room, type, data } = message;

    if (room === 'chat') {
      if (type === 'game-log') {
        addChatLog({
          id: generateRandomId(),
          isGameLog: true,
          userId: 'GameLog',
          message: data.message,
          role: 'viewer',
        });
      } else if (type === 'user-message') {
        addChatLog({
          id: generateRandomId(),
          isGameLog: false,
          userId: data.userId,
          message: data.message,
          role: data.role,
        });
      }
    }
  };
  return { chatHandler };
};
