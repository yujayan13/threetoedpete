import type { Card, GameState, Move, PlayerState } from './types';
import { compareCards, shuffleDeck } from './deck';

export function createGame(params: {
  tableId: string;
  playerIds: string[];
  playerNames?: Record<string, string | undefined>;
  ante?: number;
  initialDealerIndex?: number;
  shuffleSeed: string;
  nextShuffleSeed?: string;
}): GameState {
  const ante = params.ante ?? 10;
  const players: PlayerState[] = params.playerIds.map((id) => ({
    id,
    name: params.playerNames?.[id] ?? id,
    toes: 0,
    lastDealtCard: undefined,
    isIn: undefined,
  }));
  const { deck, commitHash } = shuffleDeck(params.shuffleSeed);
  const pot = ante * players.length;
  return {
    tableId: params.tableId,
    players,
    dealerIndex: params.initialDealerIndex ?? 0,
    deck,
    discards: [],
    pot,
    ante,
    round: 1,
    phase: 'deal',
    faceUpCards: {},
    currentShuffle: { seed: params.shuffleSeed, commitHash },
    pendingCommitHash: params.nextShuffleSeed ? shuffleDeck(params.nextShuffleSeed).commitHash : undefined,
    winnerId: undefined,
  };
}

export function getLegalMoves(state: GameState, playerId?: string): Move['type'][] {
  if (state.winnerId) return [];
  if (state.phase === 'choose') {
    if (!playerId) return [];
    const p = state.players.find((pl) => pl.id === playerId);
    if (!p) return [];
    if (typeof p.isIn === 'boolean') return [];
    return ['choose'];
  }
  if (state.phase === 'deal' || state.phase === 'reveal' || state.phase === 'between') {
    return ['advance'];
  }
  return [];
}

export function computeRanks(state: GameState): { winnerId: string | undefined; order: string[] } {
  const entries = Object.entries(state.faceUpCards).filter(([, c]) => !!c) as [string, Card][];
  const order = entries
    .sort((a, b) => compareCards(a[1], b[1]))
    .map(([pid]) => pid);
  const winnerId = order.length > 0 ? order[order.length - 1] : undefined;
  return { winnerId, order };
}

function allChoicesLocked(state: GameState): boolean {
  return state.players.every((p) => typeof p.isIn === 'boolean');
}

export function applyMove(state: GameState, move: Move): GameState {
  if (state.winnerId) return state;
  switch (move.type) {
    case 'reshuffle': {
      // Replace deck with a new shuffled deck, append remaining cards and discards first to preserve continuity
      const { deck } = shuffleDeck(move.seed);
      // Start new cycle: publish commit
      return {
        ...state,
        deck,
        discards: [],
        currentShuffle: { seed: move.seed, commitHash: move.commitHash },
      };
    }
    case 'choose': {
      if (state.phase !== 'choose') return state;
      const players = state.players.map((p) =>
        p.id === move.playerId ? { ...p, isIn: move.in } : p,
      );
      return { ...state, players };
    }
    case 'advance': {
      if (state.phase === 'deal') {
        if (state.deck.length < state.players.length) {
          // Not enough cards; server must reshuffle via separate move
          return state;
        }
        const deck = state.deck.slice();
        const players = state.players.map((p) => ({ ...p }));
        for (const p of players) {
          const card = deck.pop();
          if (!card) return state; // safety
          p.lastDealtCard = card;
          p.isIn = undefined;
        }
        return { ...state, deck, players, phase: 'choose', faceUpCards: {} };
      }
      if (state.phase === 'choose') {
        if (!allChoicesLocked(state)) return state;
        const faceUpCards: GameState['faceUpCards'] = {};
        for (const p of state.players) {
          if (p.isIn) faceUpCards[p.id] = p.lastDealtCard;
        }
        return { ...state, phase: 'reveal', faceUpCards };
      }
      if (state.phase === 'reveal') {
        const { winnerId } = computeRanks(state);
        let pot = state.pot;
        const inPlayers = state.players.filter((p) => p.isIn);
        if (inPlayers.length > 0) {
          const losers = inPlayers.filter((p) => p.id !== winnerId);
          pot += losers.length * state.ante;
        }
        const players = state.players.map((p) =>
          p.id === winnerId ? { ...p, toes: p.toes + 1 } : p,
        );
        const discards = state.discards.slice();
        for (const pid of Object.keys(state.faceUpCards)) {
          const card = state.faceUpCards[pid];
          if (card) discards.push(card);
        }
        const winner = players.find((p) => p.toes >= 3);
        if (winner) {
          return { ...state, players, pot, discards, phase: 'between', winnerId: winner.id };
        }
        const dealerIndex = (state.dealerIndex + 1) % players.length;
        return { ...state, players, pot, discards, dealerIndex, round: state.round + 1, phase: 'deal', faceUpCards: {} };
      }
      if (state.phase === 'between') {
        return state;
      }
      return state;
    }
  }
} 