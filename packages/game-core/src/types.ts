export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface PlayerState {
  id: string;
  name: string;
  toes: number;
  lastDealtCard: Card | undefined; // face-down until revealed
  isIn: boolean | undefined; // choice for current round
}

export interface TableConfig {
  ante: number; // fixed ante per player at game start
  maxPlayers: number;
  shuffleSeedCommitHash: string; // sha256(seed) committed before dealing
}

export interface ShuffleAudit {
  seed: string; // revealed when shuffle cycle ends
  commitHash: string; // sha256(seed)
}

export interface GameState {
  tableId: string;
  players: PlayerState[];
  dealerIndex: number; // 0-based index into players
  deck: Card[]; // remaining draw pile (top at end)
  discards: Card[]; // prior revealed cards
  pot: number;
  ante: number;
  round: number;
  phase: 'deal' | 'choose' | 'reveal' | 'between';
  faceUpCards: Record<string, Card | undefined>; // playerId -> card if revealed
  currentShuffle: ShuffleAudit | undefined; // current shuffle (seed hidden to clients)
  pendingCommitHash: string | undefined; // next cycle's commit published to clients
  winnerId: string | undefined; // if game ended this cycle
}

export type Move =
  | { type: 'choose'; playerId: string; in: boolean }
  | { type: 'advance' }
  | { type: 'reshuffle'; seed: string; commitHash: string }; // server-triggered when deck insufficient 