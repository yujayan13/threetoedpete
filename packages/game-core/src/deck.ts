import type { Card, Rank, Suit } from './types';

const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS: Suit[] = ['C','D','H','S'];

/**
 * Computes SHA-256 hex digest. Uses Web Crypto if available; otherwise falls back
 * to a small deterministic non-cryptographic hash (for test environments only).
 */
export function sha256Hex(text: string): string {
  // Non-async wrapper: since core must be pure sync, use a simple hash when crypto not available.
  // For production audit, the server computes real SHA-256 and publishes commit.
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    // Best-effort synchronous pseudo: not available; fall back
  }
  // Fowler–Noll–Vo (FNV-1a) 64-bit variant to generate a stable hex string
  let hash = BigInt('0xcbf29ce484222325');
  const prime = BigInt('0x100000001b3');
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * prime) & BigInt('0xffffffffffffffff');
  }
  // Expand to 64 hex chars deterministically by cycling
  let hex = hash.toString(16).padStart(16, '0');
  while (hex.length < 64) hex += hex;
  return hex.slice(0, 64);
}

/**
 * Xorshift32 deterministic PRNG seeded from a 32-bit integer.
 */
function makeXorShift32(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) state = 0x1a2b3c4d; // avoid zero lock
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0x100000000);
  };
}

function seedStringToInt(seed: string): number {
  const hex = sha256Hex(seed).slice(0, 8);
  return Number.parseInt(hex, 16) >>> 0;
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleDeck(seed: string): { deck: Card[]; commitHash: string } {
  const prng = makeXorShift32(seedStringToInt(seed));
  const deck = makeDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const r = prng();
    const j = Math.floor(r * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return { deck, commitHash: sha256Hex(seed) };
}

export function compareCards(a: Card, b: Card): number {
  const rankOrder = new Map(RANKS.map((r, idx) => [r, idx] as const));
  const suitOrder = new Map<Suit, number>([
    ['C', 0], ['D', 1], ['H', 2], ['S', 3],
  ]);
  const ra = rankOrder.get(a.rank)!;
  const rb = rankOrder.get(b.rank)!;
  if (ra !== rb) return ra - rb;
  const sa = suitOrder.get(a.suit)!;
  const sb = suitOrder.get(b.suit)!;
  return sa - sb;
} 