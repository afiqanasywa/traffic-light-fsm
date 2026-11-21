import React from 'react';

const STATUS_LABEL = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
};

export default function StatusPanel({ light, phase, secondsRemaining, progress, status }) {
  return (
    <section className="status" aria-live="polite">
      <div className="status__light" style={{ color: phase.color }}>
        {light.toUpperCase()}
      </div>
      <div className="status__hint">{phase.label}</div>
      <div className="status__timer">{secondsRemaining}s</div>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="progress__bar"
          style={{ transform: `scaleX(${progress})`, background: phase.color }}
        />
      </div>
      <div className={`badge badge--${status}`}>{STATUS_LABEL[status]}</div>
    </section>
  );
}
