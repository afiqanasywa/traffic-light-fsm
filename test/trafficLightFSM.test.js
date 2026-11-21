import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS,
  STATUS,
  TRAFFIC_LIGHT_CONFIG,
  createInitialState,
  toDisplaySeconds,
  transition,
  validateConfig,
} from '../src/fsm/trafficLightFSM.js';

const start = { type: EVENTS.START };
const pause = { type: EVENTS.PAUSE };
const toggle = { type: EVENTS.TOGGLE };
const reset = { type: EVENTS.RESET };
const tick = (delta) => ({ type: EVENTS.TICK, delta });

const run = (events, state = createInitialState()) =>
  events.reduce((s, e) => transition(s, e), state);

describe('initial state', () => {
  it('starts on red, idle, with the full red duration', () => {
    assert.deepEqual(createInitialState(), { light: 'red', remaining: 5000, status: STATUS.IDLE });
  });

  it('ignores ticks before start', () => {
    const s = createInitialState();
    assert.equal(transition(s, tick(10_000)), s);
  });
});

describe('cycle order and durations', () => {
  it('goes red (5s) -> green (4s) -> yellow (2s) -> red', () => {
    let s = run([start]);
    s = transition(s, tick(4999));
    assert.equal(s.light, 'red');
    s = transition(s, tick(1));
    assert.equal(s.light, 'green');
    assert.equal(s.remaining, 4000);
    s = transition(s, tick(4000));
    assert.equal(s.light, 'yellow');
    assert.equal(s.remaining, 2000);
    s = transition(s, tick(2000));
    assert.equal(s.light, 'red');
    assert.equal(s.remaining, 5000);
  });

  it('gives the same result for many small frames as for one big one', () => {
    const frames = Array.from({ length: 1000 }, () => tick(16));
    const small = run([start, ...frames]);
    const big = run([start, tick(16_000)]);
    assert.deepEqual(small, big);
  });
});

describe('pause / resume', () => {
  it('freezes the light and countdown while paused', () => {
    const paused = run([start, tick(3200), pause]);
    const later = run([tick(60_000), tick(5), tick(99_999)], paused);
    assert.equal(later, paused);
    assert.equal(paused.light, 'red');
    assert.equal(paused.remaining, 1800);
  });

  it('resumes from the exact remaining time', () => {
    const s = run([start, tick(3200), pause, tick(10_000), start, tick(1800)]);
    assert.equal(s.light, 'green');
    assert.equal(s.remaining, 4000);
  });

  it('handles rapid start/pause toggling deterministically', () => {
    const even = run([start, tick(1000), ...Array(20).fill(toggle)]);
    assert.equal(even.status, STATUS.RUNNING);
    const odd = run([start, tick(1000), ...Array(21).fill(toggle)]);
    assert.equal(odd.status, STATUS.PAUSED);
    assert.equal(odd.remaining, 4000);
  });

  it('treats repeated START / PAUSE as no-ops', () => {
    const running = run([start]);
    assert.equal(transition(running, start), running);
    const idle = createInitialState();
    assert.equal(transition(idle, pause), idle);
  });
});

describe('reset', () => {
  it('returns to red and stops, from any state', () => {
    for (const events of [[start, tick(6000)], [start, tick(9500), pause], [start]]) {
      assert.deepEqual(run([...events, reset]), createInitialState());
    }
  });
});

describe('lag and skipped frames', () => {
  it('carries leftover time into the next phase', () => {
    const s = run([start, tick(5500)]);
    assert.equal(s.light, 'green');
    assert.equal(s.remaining, 3500);
  });

  it('walks through several phases in one long frame', () => {
    // 5000 red + 4000 green + 2000 yellow + 1000 into red
    const s = run([start, tick(12_000)]);
    assert.equal(s.light, 'red');
    assert.equal(s.remaining, 4000);
  });

  it('stays in sync after a very long gap (e.g. a backgrounded tab)', () => {
    const cycle = 11_000;
    const s = run([start, tick(cycle * 1000 + 6000)]);
    assert.equal(s.light, 'green');
    assert.equal(s.remaining, 3000);
  });

  it('ignores zero, negative and non-numeric deltas', () => {
    const s = run([start, tick(1000)]);
    for (const bad of [0, -500, NaN, Infinity, undefined, 'abc']) {
      assert.equal(transition(s, tick(bad)), s);
    }
  });
});

describe('scalability', () => {
  it('supports new phases through config alone', () => {
    const withPedestrian = {
      initial: 'red',
      states: {
        red: { duration: 3000, next: 'walk' },
        walk: { duration: 2000, next: 'green' },
        green: { duration: 3000, next: 'yellow' },
        yellow: { duration: 1000, next: 'red' },
      },
    };
    validateConfig(withPedestrian);
    let s = transition(createInitialState(withPedestrian), start, withPedestrian);
    s = transition(s, tick(3000), withPedestrian);
    assert.equal(s.light, 'walk');
    s = transition(s, tick(2000), withPedestrian);
    assert.equal(s.light, 'green');
  });

  it('rejects configs that would break the machine', () => {
    assert.doesNotThrow(() => validateConfig(TRAFFIC_LIGHT_CONFIG));
    assert.throws(() => validateConfig({ initial: 'x', states: { a: { duration: 1, next: 'a' } } }));
    assert.throws(() => validateConfig({ initial: 'a', states: { a: { duration: 1, next: 'b' } } }));
    assert.throws(() => validateConfig({ initial: 'a', states: { a: { duration: 0, next: 'a' } } }));
    assert.throws(() => validateConfig({ initial: 'a', states: {} }));
  });
});

describe('display helpers', () => {
  it('rounds seconds up so the switch happens as "1s" ends', () => {
    assert.equal(toDisplaySeconds(5000), 5);
    assert.equal(toDisplaySeconds(4001), 5);
    assert.equal(toDisplaySeconds(1), 1);
    assert.equal(toDisplaySeconds(0), 0);
  });
});

describe('purity', () => {
  it('never mutates the input state', () => {
    const s = Object.freeze(run([start]));
    assert.doesNotThrow(() => transition(s, tick(20_000)));
    assert.doesNotThrow(() => transition(s, pause));
    assert.doesNotThrow(() => transition(s, reset));
  });
});
