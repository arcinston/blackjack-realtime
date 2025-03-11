import { betStateAtom } from '@/atoms/blackjack.atom';
import { timeStateAtom } from '@/atoms/time.atom';
import { userAtom } from '@/atoms/user.atom';
import CustomButton from '@/components/ui/CustomButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBlackjack } from '@/hooks/useBlackjack';
import { useVault } from '@/hooks/useVault';
import { useAtomValue } from 'jotai';
import { Hand, HandCoins, HandHelping } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PlayerState } from '../../../../party/blackjack/blackjack.types';
import { Input } from '../../ui/input';
import BatteryButton from '../Sidebar/BatteryButton';
import { ESoundType, playSound } from '../Utils/sound';

const ControlCentre = () => {
  const user = useAtomValue(userAtom);
  const { blackjackSend, gameState } = useBlackjack();
  const [betAmount, setBetAmount] = useState(0);
  const [player, setPlayer] = useState<PlayerState | undefined>(undefined);
  const { state, userId } = useAtomValue(timeStateAtom);
  const { balances } = useVault();
  const betState = useAtomValue(betStateAtom);

  const isCurrentTurn =
    state === 'playerTimerStart' && !!player && userId === player.userId;

  const isHitOrStand =
    !!player &&
    gameState.status === 'playing' &&
    player.bet > 0 &&
    isCurrentTurn;

  const isBet =
    !!player &&
    (gameState.status === 'betting' || gameState.status === 'waiting');

  useEffect(() => {
    const getCurrentPlayer = () => {
      if (!user.walletAddress) return;
      for (const player of Object.values(gameState.players)) {
        if (player.userId === user.walletAddress) {
          return player;
        }
      }
    };
    setPlayer(getCurrentPlayer());
  }, [gameState, betAmount, user]);

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-4 py-4 border-b border-zinc-900">
        <div className="flex flex-col space-y-2 px-4">
          <div className="text-zinc-400 text-sm">Bet Amount</div>
          <div className="flex space-x-4">
            <Input
              value={betAmount}
              onChange={(e) => {
                if (
                  Number.isNaN(Number(e.target.value)) ||
                  Number(e.target.value) < 0 ||
                  Number(e.target.value) % 1 !== 0
                )
                  return;
                setBetAmount(Number(e.target.value) ?? 0);
              }}
              placeholder="Place your bet"
              className="border-zinc-800 bg-zinc-900 rounded-lg focus-visible:ring-zinc-700"
            />
            <CustomButton
              dark
              onClick={() => setBetAmount(betAmount + 10)}
              className="w-8"
            >
              <div className="text-zinc-100 text-xs">+10</div>
            </CustomButton>
            <CustomButton
              dark
              onClick={() => setBetAmount(betAmount + 100)}
              className="w-10"
            >
              <div className="text-zinc-100 text-xs">+100</div>
            </CustomButton>
            <CustomButton
              dark
              onClick={() => {
                setBetAmount(Number(balances.vaultBalance));
              }}
            >
              All In
            </CustomButton>
          </div>
        </div>
        <div className="flex px-4 space-x-4">
          <Tooltip>
            <TooltipTrigger>
              <BatteryButton
                animate={false}
                disabled={!isHitOrStand}
                className="text-zinc-100 bg-green-600"
                onClick={() => {
                  blackjackSend({
                    type: 'hit',
                    data: {},
                  });
                }}
              >
                <div className="flex justify-center w-full space-x-1">
                  <div className="w-fit">Hit</div>
                  <HandHelping />
                </div>
              </BatteryButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>To Pick a Card from the Deck</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <BatteryButton
                disabled={!isHitOrStand}
                animate={isHitOrStand}
                className="text-zinc-100 h-12 bg-red-600"
                onClick={() => {
                  blackjackSend({
                    type: 'stand',
                    data: {},
                  });
                }}
              >
                <div className="flex justify-center w-full space-x-1  items-center">
                  <div className="w-fit">Stand</div>
                  <Hand size={18} />
                </div>
              </BatteryButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Choose "Stand" when you're satisfied with your cards or fear that drawing another card might cause you to bust </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="px-4">
          <Tooltip>
            <TooltipTrigger>
              <BatteryButton
                disabled={
                  !(isBet && (betState === null || betState === 'bet-placed')) ||
                  !(Number(betAmount) > 0) ||
                  player?.bet !== 0 ||
                  betAmount > Number(balances.vaultBalance)
                }
                animate={false}
                className="text-zinc-900 h-12 bg-zinc-200"
                isBet
                onClick={() => {
                  if (!player || player.bet !== 0) return;
                  if (Number(betAmount) > 0) {
                    playSound(ESoundType.BET);
                    blackjackSend({
                      type: 'placeBet',
                      data: {
                        bet: Number(betAmount),
                      },
                    });
                  } else {
                    console.log('Enter amount > 0');
                  }
                }}
              >
                <div className="flex justify-center w-full space-x-1  items-center">
                  <div className="w-fit">{betState === null ? 'Bet' : betState}</div>
                  <HandCoins size={18} />
                </div>
              </BatteryButton>
            </TooltipTrigger>
            <TooltipContent>
              {
                player ?
                  <p> To Place a Bet </p>
                  :
                  <p> Select a Seat to Bet </p>
              }
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider >
  );
};

export default ControlCentre;
