import React from 'react';

const SPEEDS = [0.5, 1, 2, 5];
const LAG_SPIKES = [
  { label: '+16ms frame', ms: 16 },
  { label: '+1s lag', ms: 1000 },
  { label: '+7s lag', ms: 7000 },
];

/**
 * Tools for poking at edge cases in the browser: lag spikes that cross
 * phase boundaries, rapid start/pause and time scaling.
 */
export default function DebugPanel({ isRunning, speed, onSpeedChange, onSkip, onToggle }) {
  const rapidToggle = () => {
    // 11 toggles in the same tick: the net result must be one toggle.
    for (let i = 0; i < 11; i += 1) onToggle();
  };

  return (
    <details className="debug">
      <summary>Edge-case tools</summary>

      <div className="debug__row">
        <span className="debug__label">Speed</span>
        <div className="segmented" role="radiogroup" aria-label="Simulation speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              className={`segmented__item${speed === s ? ' is-active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="debug__row">
        <span className="debug__label">Simulate lag</span>
        <div className="debug__actions">
          {LAG_SPIKES.map(({ label, ms }) => (
            <button
              key={ms}
              type="button"
              className="btn btn--ghost"
              disabled={!isRunning}
              onClick={() => onSkip(ms)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="debug__row">
        <span className="debug__label">Stress</span>
        <button type="button" className="btn btn--ghost" onClick={rapidToggle}>
          Rapid toggle ×11
        </button>
      </div>

      {!isRunning && <p className="debug__note">Lag only applies while running: a paused light doesn't move.</p>}
    </details>
  );
}
