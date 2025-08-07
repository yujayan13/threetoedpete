import { createGame, applyMove, getLegalMoves } from '../src/game';

function makeState() {
  return createGame({
    tableId: 't1',
    playerIds: ['p1', 'p2', 'p3'],
    playerNames: { p1: 'A', p2: 'B', p3: 'C' },
    ante: 10,
    shuffleSeed: 'seed-1',
  });
}

test('game lifecycle basic', () => {
  let s = makeState();
  expect(s.phase).toBe('deal');
  s = applyMove(s, { type: 'advance' });
  expect(s.phase).toBe('choose');
  // All players choose
  for (const pid of ['p1', 'p2', 'p3']) {
    expect(getLegalMoves(s, pid)).toContain('choose');
    s = applyMove(s, { type: 'choose', playerId: pid, in: true });
  }
  s = applyMove(s, { type: 'advance' });
  expect(s.phase).toBe('reveal');
  s = applyMove(s, { type: 'advance' });
  expect(['deal', 'between']).toContain(s.phase);
}); 