/**
 * Traffic light finite state machine.
 *
 * Everything in this module is pure: no timers, no React, no DOM.
 * The machine is driven entirely by events, including time itself
 * (`TICK` carries the elapsed milliseconds), which makes it trivial to
 * unit-test and to reason about edge cases such as lag or dropped frames.
 *
 * Machine state shape:
 *   {
 *     light:     string  // current phase key, e.g. "red"
 *     remaining: number  // ms left in the current phase
 *     status:    "idle" | "running" | "paused"
 *   }
 */

export const STATUS = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
});

export const EVENTS = Object.freeze({
  START: 'START',
  PAUSE: 'PAUSE',
  TOGGLE: 'TOGGLE',
  RESET: 'RESET',
  TICK: 'TICK',
});

/**
 * Default configuration. To add a phase (e.g. a pedestrian walk light),
 * add an entry here and point another phase's `next` at it. No other
 * code needs to change.
 *
 * The key order of `states` is also the top-to-bottom order the lamps
 * are drawn in the UI.
 */
export const TRAFFIC_LIGHT_CONFIG = Object.freeze({
  initial: 'red',
  states: Object.freeze({
    red: Object.freeze({ duration: 5000, next: 'green', color: '#ff3b30', label: 'Stop' }),
    yellow: Object.freeze({ duration: 2000, next: 'red', color: '#ffcc00', label: 'Slow down' }),
    green: Object.freeze({ duration: 4000, next: 'yellow', color: '#34c759', label: 'Go' }),
  }),
});

/**
 * Throws if the config can't produce a working machine: an unknown
 * initial phase, a `next` that points nowhere, or a non-positive
 * duration (which would make TICK loop forever).
 */
export function validateConfig(config) {
  const { initial, states } = config ?? {};
  if (!states || typeof states !== 'object' || Object.keys(states).length === 0) {
    throw new Error('Config must define at least one state');
  }
  if (!(initial in states)) {
    throw new Error(`Initial state "${initial}" is not defined`);
  }
  for (const [name, def] of Object.entries(states)) {
    if (!(Number.isFinite(def.duration) && def.duration > 0)) {
      throw new Error(`State "${name}" must have a positive duration`);
    }
    if (!(def.next in states)) {
      throw new Error(`State "${name}" transitions to unknown state "${def.next}"`);
    }
  }
  return config;
}

export function createInitialState(config = TRAFFIC_LIGHT_CONFIG) {
  return {
    light: config.initial,
    remaining: config.states[config.initial].duration,
    status: STATUS.IDLE,
  };
}

/**
 * Advances the running clock by `delta` ms. If `delta` spans more than
 * one phase (a long frame, a backgrounded tab), every phase it covers is
 * walked through, so no time is lost and the light ends up exactly where
 * it would have been with perfect timing.
 */
function advance(state, delta, config) {
  let { light, remaining } = state;
  let left = delta;

  while (left >= remaining) {
    left -= remaining;
    light = config.states[light].next;
    remaining = config.states[light].duration;
  }

  return { ...state, light, remaining: remaining - left };
}

/**
 * The reducer: (state, event) -> state. It returns the same object when an
 * event changes nothing, so React can skip re-rendering.
 */
export function transition(state, event, config = TRAFFIC_LIGHT_CONFIG) {
  switch (event.type) {
    case EVENTS.START:
      return state.status === STATUS.RUNNING ? state : { ...state, status: STATUS.RUNNING };

    case EVENTS.PAUSE:
      return state.status === STATUS.RUNNING ? { ...state, status: STATUS.PAUSED } : state;

    case EVENTS.TOGGLE:
      return transition(
        state,
        { type: state.status === STATUS.RUNNING ? EVENTS.PAUSE : EVENTS.START },
        config,
      );

    case EVENTS.RESET:
      return createInitialState(config);

    case EVENTS.TICK: {
      // Time only flows while running, so paused or idle machines ignore
      // ticks, including late frames that land after a pause.
      if (state.status !== STATUS.RUNNING) return state;
      const delta = Number(event.delta);
      if (!Number.isFinite(delta) || delta <= 0) return state;
      return advance(state, delta, config);
    }

    default:
      return state;
  }
}

/** Seconds shown to the user: rounded up, so "1s" is shown until the switch. */
export function toDisplaySeconds(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}
