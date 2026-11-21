import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  EVENTS,
  STATUS,
  TRAFFIC_LIGHT_CONFIG,
  createInitialState,
  toDisplaySeconds,
  transition,
  validateConfig,
} from '../fsm/trafficLightFSM';

/**
 * Connects the pure FSM to real time.
 *
 * The only job of this hook is to measure elapsed time with
 * requestAnimationFrame and send it to the machine as TICK events. All
 * decisions about what happens next live in `transition`.
 *
 * @param {object} [config]        FSM config (see TRAFFIC_LIGHT_CONFIG)
 * @param {object} [options]
 * @param {number} [options.speed] Time multiplier, useful for demos and testing
 */
export default function useTrafficLight(config = TRAFFIC_LIGHT_CONFIG, { speed = 1 } = {}) {
  const reducer = useCallback((state, event) => transition(state, event, config), [config]);
  const [state, dispatch] = useReducer(reducer, config, (cfg) =>
    createInitialState(validateConfig(cfg)),
  );

  // Kept in a ref so changing speed doesn't restart the animation loop.
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const isRunning = state.status === STATUS.RUNNING;

  useEffect(() => {
    if (!isRunning) return undefined;

    let rafId;
    let last = null;

    const loop = (now) => {
      if (last !== null) {
        dispatch({ type: EVENTS.TICK, delta: (now - last) * speedRef.current });
      }
      last = now;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    // Cleanup runs on pause, reset and unmount, so a loop is never orphaned.
    return () => cancelAnimationFrame(rafId);
  }, [isRunning]);

  const start = useCallback(() => dispatch({ type: EVENTS.START }), []);
  const pause = useCallback(() => dispatch({ type: EVENTS.PAUSE }), []);
  const toggle = useCallback(() => dispatch({ type: EVENTS.TOGGLE }), []);
  const reset = useCallback(() => dispatch({ type: EVENTS.RESET }), []);
  /** Inject a time jump, e.g. to simulate a lag spike or a dropped frame. */
  const skip = useCallback((ms) => dispatch({ type: EVENTS.TICK, delta: ms }), []);

  const phase = config.states[state.light];

  return {
    light: state.light,
    phase,
    status: state.status,
    isRunning,
    remainingMs: state.remaining,
    secondsRemaining: toDisplaySeconds(state.remaining),
    progress: 1 - state.remaining / phase.duration,
    start,
    pause,
    toggle,
    reset,
    skip,
  };
}
