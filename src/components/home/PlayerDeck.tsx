import { useWindowSize } from '@/hooks/useWindowSize';
import { truncateAddress } from '@/lib/utils';
import type { FC } from 'react';
import DeckOfCards2 from './DeckOfCards2';
import type { TPlayingCardSize } from './PlayingCard';

type TPlayingCardProps = {
  cards: string[];
  walletAddress: string;
  bet?: number;
};

const PlayerDeck: FC<TPlayingCardProps> = ({ bet, cards, walletAddress }) => {
  const { width } = useWindowSize();
  const size: TPlayingCardSize = width < 1280 ? 'sm' : 'md';

  const calculate = (): {
    bottom: string;
    left: string;
  } => {
    let bottom = 0;
    let left = 0;
    switch (size) {
      case 'sm':
        bottom = -16 * cards.length - 8;
        left = -1 * cards.length;
        break;
      case 'md':
        bottom = -14 * cards.length - 12;
        left = -10 * cards.length - 12;
        break;
      // case "lg":
      //   bottom = -18 * cards.length - 16;
      //   break;
    }
    return {
      bottom: `${bottom}px`,
      left: `${left}px`,
    };
  };
  return (
    <div className="w-full flex justify-center items-center">
      <div className="flex flex-col items-center relative lg:bottom-4 xl:bottom-12 left-2">
        <DeckOfCards2
          cards={cards}
          flipped
          // state={EPlayingCardState.focus}
          size={size}
        />
        <div
          className="flex xl:space-x-2 xl:flex-row absolute bottom-0 flex-col space-y-2 xl:space-y-0 items-center"
          style={{
            bottom: calculate().bottom,
            left: calculate().left,
          }}
        >
          <div className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-200">
            <div className="whitespace-nowrap">
              {truncateAddress(walletAddress)}
            </div>
          </div>
          {!!bet && (
            <div className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-200">
              <div className="whitespace-nowrap">Bet: {bet}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDeck;
