import { setGameStateAtom } from '@/atoms/blackjack.atom';
import { timeStateAtom } from '@/atoms/time.atom';
import { useSetAtom } from 'jotai';
import type { TPartyKitServerMessage } from '../../../party';

export const useBlackjackHandler = () => {
  const setGameState = useSetAtom(setGameStateAtom);
  const setTimeState = useSetAtom(timeStateAtom);
  const blackjackHandler = (message: TPartyKitServerMessage) => {
    const { room, type, data } = message;

    if (room === 'blackjack') {
      if (type === 'stateUpdate') {
        setGameState(data.state);
      } else if (type === 'betTimerStart') {
        setTimeState({ startedAt: data.startedAt, state: 'betTimerStart' });
        console.log('bet timer start');
      } else if (type === 'betTimerEnd') {
        // setTimeState({startedAt: data.endedAt, state:"betTimerEnd"})
        console.log('bet timer end');
      } else if (type === 'playerTimerStart') {
        setTimeState({ startedAt: data.startedAt, state: 'playerTimerStart' });
        console.log('player turn start', data);
      } else if (type === 'playerTimerEnd') {
        console.log('player turn end', data);
      }
    }
  };
  return { blackjackHandler };
};
