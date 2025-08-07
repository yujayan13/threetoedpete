#!/usr/bin/env ts-node
import { createGame, applyMove } from '../src';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]?.replace(/^--/, '');
    const v = args[i + 1];
    if (k && v) out[k] = v;
  }
  return out;
}

const { players = '4', hands = '1000' } = parseArgs();
const numPlayers = Number(players);
const numHands = Number(hands);

const playerIds = Array.from({ length: numPlayers }, (_, i) => `p${i + 1}`);

let wins: Record<string, number> = Object.fromEntries(playerIds.map((p) => [p, 0] as const));
for (let h = 0; h < numHands; h++) {
  let state = createGame({
    tableId: `t1`,
    playerIds,
    ante: 10,
    shuffleSeed: `seed-${h}`,
  });
  // Run until someone wins
  while (!state.winnerId) {
    state = applyMove(state, { type: 'advance' }); // deal
    for (const pid of playerIds) {
      const inFlag = Math.random() < 0.6; // external randomness allowed in CLI only
      state = applyMove(state, { type: 'choose', playerId: pid, in: inFlag });
    }
    state = applyMove(state, { type: 'advance' }); // reveal
    state = applyMove(state, { type: 'advance' }); // progress
  }
  wins[state.winnerId]++;
}

console.log(JSON.stringify({ players: numPlayers, hands: numHands, wins }, null, 2)); 