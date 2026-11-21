import React from 'react';

export default function Controls({ isRunning, onToggle, onReset }) {
  return (
    <div className="controls">
      <button type="button" className="btn btn--primary" onClick={onToggle}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button type="button" className="btn btn--danger" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
