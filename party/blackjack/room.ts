import type * as Party from 'partykit/server';
import {
  BlackjackMessageSchema,
  type BlackjackRecord,
  type GameState,
  type PlayerJoinData,
  type PlayerState,
  type TBlackjackServerMessage,
} from './blackjack.types';

import type { ConnectionState } from '..';
import { createDeck, handValue } from './blackjack.utils';

/*-------------------------------------------------------------------------
  BlackjackRoom Class
  This class encapsulates all game state and logic for Blackjack.
---------------------------------------------------------------------------*/
export class BlackjackRoom {
  readonly id: string;
  room: Party.Room;
  readonly maxPlayers = 5;
  state: GameState;

  constructor(id: string, room: Party.Room) {
    this.id = id;
    this.room = room;
    this.state = {
      players: {},
      dealerHand: [],
      deck: createDeck(),
      playerOrder: [],
      currentPlayerIndex: 0,
      status: 'waiting',
    };
  }

  broadcast<T extends keyof BlackjackRecord>(
    message: TBlackjackServerMessage<T>,
    without?: string[],
  ) {
    this.room.broadcast(JSON.stringify(message), without);
  }

  send<T extends keyof BlackjackRecord>(
    id: string,
    message: TBlackjackServerMessage<T>,
  ) {
    const connection = this.room.getConnection(id);
    if (!connection) {
      return;
    }

    connection.send(JSON.stringify(message));
  }

  getPlayer(userId: `0x${string}`): PlayerState | undefined {
    for (const player of Object.values(this.state.players)) {
      if (player.userId === userId) {
        return player;
      }
    }
  }

  getSeat(userId: `0x${string}`): number | undefined {
    const player = this.getPlayer(userId);
    if (!player) return undefined;
    return player.seat;
  }

  async onJoin(connection: Party.Connection<ConnectionState>) {
    // check if wallet adddress is already in the game
    const userId = connection.state?.userId;
    if (userId === undefined) {
      //close connection throw error
      //TODO:Implement close error codes
      connection.close(4000, 'Invalid wallet address');
      console.log("didn't join blackjackroom ", { connection });

      return;
    }

    if (userId !== 'guest') {
      const player = this.getPlayer(userId);
      if (player) {
        const oldConnection = this.room.getConnection(player.connectionId);
        if (oldConnection) {
          oldConnection.close(
            4000,
            'Player already in game, Reconnected , Closing Old Socket',
          );
        }
        player.connectionId = connection.id;
      }
    }

    this.send(connection.id, {
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });

    console.log('joined blackjackroom', { connection });
  }

  async onMessage(
    connection: Party.Connection<ConnectionState>,
    unknownData: unknown,
  ): Promise<void> {
    const { type, data } = BlackjackMessageSchema.parse(unknownData);
    const userId = connection.state?.userId;
    if (!userId) {
      throw new Error('User ID not found');
    }
    if (userId === 'guest') {
      throw new Error('Guests cannot join the game');
    }
    // check if player is a connected client
    if (connection.readyState !== WebSocket.OPEN) {
      throw new Error('Player is not connected');
    }

    switch (type) {
      case 'playerJoin': {
        this.playerJoin(connection.id, userId, { seat: data.seat });
        break;
      }
      case 'placeBet': {
        this.placeBet(userId, data.bet);
        break;
      }
      case 'startRound': {
        this.startRound();
        break;
      }
      case 'hit': {
        this.playerHit(userId);
        break;
      }
      case 'stand': {
        this.playerStand(userId);
        break;
      }
      default:
        console.warn(`Unknown message type: ${type}`);
    }
    console.log({ gamestate: this.state });
  }

  playerJoin(
    connectionId: string,
    userId: `0x${string}`,
    data: PlayerJoinData,
  ) {
    if (Object.keys(this.state.players).length >= this.maxPlayers) {
      throw new Error('Table is full');
    }
    const { seat } = data;

    //check if player is already connected
    if (Object.values(this.state.players).some((p) => p.userId === userId)) {
      throw new Error('Player is already connected');
    }

    //check if seat is already taken
    if (this.state.players[seat]) {
      throw new Error('Seat is already taken');
    }

    this.state.players[seat] = {
      connectionId,
      userId,
      seat,
      bet: 0,
      hand: [],
      done: false,
      hasBusted: false,
      isStanding: false,
    };

    // Update order by seat.
    this.state.playerOrder = Object.values(this.state.players)
      .sort((a, b) => a.seat - b.seat)
      .map((p) => p.userId);
    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  playerLeave(userId: `0x${string}`): void {
    const seat = this.getSeat(userId);
    if (!seat) return;

    delete this.state.players[seat];

    this.state.playerOrder = Object.values(this.state.players)
      .sort((a, b) => a.seat - b.seat)
      .map((p) => p.userId);

    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  placeBet(userId: `0x${string}`, bet: number): void {
    if (this.state.status !== 'waiting' && this.state.status !== 'betting') {
      return;
    }

    const seat = this.getSeat(userId);
    if (!seat) return;

    const p = this.state.players[seat];
    if (!p) return;

    p.bet = bet;

    this.state.status = 'betting';

    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  startRound(): void {
    if (Object.keys(this.state.players).length === 0) return;
    if (this.state.status !== 'betting') return;
    // Replenish deck if needed.
    if (this.state.deck.length < 15) {
      this.state.deck = createDeck();
    }

    // Reset players' state.
    for (const player of Object.values(this.state.players)) {
      player.hand = [];
      player.done = false;
      player.hasBusted = false;
      player.isStanding = false;
    }
    this.state.dealerHand = [];
    // Deal two cards to every player and two to the dealer.
    for (let i = 0; i < 2; i++) {
      for (const pid of this.state.playerOrder) {
        const seat = this.getSeat(pid);
        if (!seat) continue;
        const player = this.state.players[seat];
        if (!player) throw new Error('Player not found');
        const card = this.state.deck.pop();
        if (!card) throw new Error('Deck is empty');
        player.hand.push(card);
      }
      const card = this.state.deck.pop();
      if (!card) throw new Error('Deck is empty');
      this.state.dealerHand.push(card);
    }
    this.state.status = 'playing';

    this.state.currentPlayerIndex = 0;
    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  playerHit(userId: `0x${string}`): void {
    const currentPlayerId =
      this.state.playerOrder[this.state.currentPlayerIndex];
    if (userId !== currentPlayerId) return;

    const seat = this.getSeat(userId);
    if (!seat) throw new Error('Seat not found');

    const p = this.state.players[seat];
    if (!p) throw new Error('Player not found');
    const card = this.state.deck.pop();
    if (!card) throw new Error('Deck is empty');
    p.hand.push(card);
    if (handValue(p.hand) > 21) {
      p.hasBusted = true;
      p.done = true;
      this.advanceTurn();
    }
    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  playerStand(userId: `0x${string}`): void {
    const currentPlayerId =
      this.state.playerOrder[this.state.currentPlayerIndex];
    if (userId !== currentPlayerId) return;
    const seat = this.getSeat(userId);
    if (!seat) throw new Error('Seat not found');
    const p = this.state.players[seat];
    if (!p) throw new Error('Player not found');
    p.isStanding = true;
    p.done = true;
    this.advanceTurn();
    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }

  advanceTurn(): void {
    while (this.state.currentPlayerIndex < this.state.playerOrder.length - 1) {
      this.state.currentPlayerIndex++;
      const pid = this.state.playerOrder[this.state.currentPlayerIndex];
      if (!pid) throw new Error('Player ID not found');
      const seat = this.getSeat(pid);
      if (!seat) throw new Error('Seat not found');
      const player = this.state.players[seat];
      if (!player) throw new Error('Player not found');
      if (!player.done) {
        return;
      }
    }
    // All players have been processed; now it's the dealer's turn.
    this.state.status = 'dealerTurn';
    this.dealerPlay();
  }

  dealerPlay(): void {
    while (handValue(this.state.dealerHand) < 17) {
      const card = this.state.deck.pop();
      if (!card) throw new Error('Deck is empty');
      this.state.dealerHand.push(card);
    }
    this.endRound();
  }

  endRound(): void {
    this.state.status = 'roundover';
    const dealerScore = handValue(this.state.dealerHand);
    for (const pid of this.state.playerOrder) {
      const seat = this.getSeat(pid);
      if (!seat) throw new Error('Seat not found');
      const p = this.state.players[seat];
      if (!p) {
        throw new Error(`Player ${pid} not found`);
      }
      const playerScore = handValue(p.hand);
      if (p.hasBusted) {
        console.log(`Player ${pid} busted and loses bet ${p.bet}`);
      } else if (dealerScore > 21 || playerScore > dealerScore) {
        console.log(
          `Player ${pid} wins! (Player: ${playerScore} vs Dealer: ${dealerScore})`,
        );
      } else if (playerScore === dealerScore) {
        console.log(`Player ${pid} pushes with ${playerScore}`);
      } else {
        console.log(
          `Player ${pid} loses. (Player: ${playerScore} vs Dealer: ${dealerScore})`,
        );
      }
    }
    this.broadcast({
      room: 'blackjack',
      type: 'stateUpdate',
      data: { state: this.state },
    });
  }
}
