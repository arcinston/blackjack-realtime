import { useWindowSize } from '@/hooks/useWindowSize';
import { truncateAddress } from '@/lib/utils';
import { type FC, memo } from 'react';
import DeckOfCards4 from '../DeckOfCards4';
import type { EPlayingCardState, TPlayingCardSize } from '../PlayingCard';

// import DeckOfCards2 from "./DeckOfCards2";

type TPlayingCardProps = {
  cards: string[];
  walletAddress: string;
  bet?: number;
  dealer?: boolean;
  state?: EPlayingCardState;
  index: number;
  animateCards: Set<string>;
  dealerDelay?: number;
};

const PlayerDeck: FC<TPlayingCardProps> = memo(
  ({
    bet,
    cards,
    walletAddress,
    dealer,
    state,
    index,
    animateCards,
    dealerDelay,
  }) => {
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
        <div className="flex flex-col items-center relative lg:bottom-[-14px] xl:bottom-[-48px] left-2">
          <DeckOfCards4
            cards={cards}
            state={state}
            size={size}
            animate={!dealer}
            extraDelay={dealer ? dealerDelay : index * 0.6 * animateCards.size}
            animateCards={animateCards}
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

            <div className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-200">
              <div className="whitespace-nowrap">
                {dealer ? <div>Dealer</div> : <div>Bet: {bet}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.cards === nextProps.cards &&
      prevProps.state === nextProps.state &&
      prevProps.animateCards === nextProps.animateCards
    );
  },
);

export default PlayerDeck;
