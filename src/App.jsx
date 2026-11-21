import React, { useState } from 'react';
import { TRAFFIC_LIGHT_CONFIG } from './fsm/trafficLightFSM';
import useTrafficLight from './hooks/useTrafficLight';
import TrafficLight from './components/TrafficLight';
import StatusPanel from './components/StatusPanel';
import Controls from './components/Controls';
import DebugPanel from './components/DebugPanel';

export default function App() {
  const [speed, setSpeed] = useState(1);
  const tl = useTrafficLight(TRAFFIC_LIGHT_CONFIG, { speed });

  return (
    <main className="app">
      <h1 className="app__title">Traffic Light FSM</h1>
      <TrafficLight states={TRAFFIC_LIGHT_CONFIG.states} active={tl.light} />
      <StatusPanel
        light={tl.light}
        phase={tl.phase}
        secondsRemaining={tl.secondsRemaining}
        progress={tl.progress}
        status={tl.status}
      />
      <Controls isRunning={tl.isRunning} onToggle={tl.toggle} onReset={tl.reset} />
      <DebugPanel
        isRunning={tl.isRunning}
        speed={speed}
        onSpeedChange={setSpeed}
        onSkip={tl.skip}
        onToggle={tl.toggle}
      />
    </main>
  );
}
