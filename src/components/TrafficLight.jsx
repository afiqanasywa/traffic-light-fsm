import React from 'react';

/**
 * Purely presentational: draws one lamp per configured state and lights
 * up the active one. Knows nothing about timers or transitions.
 */
export default function TrafficLight({ states, active }) {
  return (
    <div className="housing" role="img" aria-label={`Traffic light showing ${active}`}>
      {Object.entries(states).map(([name, { color }]) => {
        const on = name === active;
        return (
          <div
            key={name}
            className={`lamp${on ? ' lamp--on' : ''}`}
            style={{ '--lamp-color': color }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
