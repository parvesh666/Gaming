import React, { useState } from 'react';
import Dice from '../Dice/Dice';
import './Controls.css';
import { COLORS } from '../../utils/constants';

const Controls = ({ turn, diceValue, diceRolled, rollId, onRoll, isMyTurn = true, setIsRolling, players }) => {
  const [isRolling, setLocalIsRolling] = useState(false);
  const currentPlayer = players?.find(p => p.color === turn);
  const displayName = currentPlayer?.playerName || `${turn} player`;
  
  const handleRollingStateChange = (state) => {
    setLocalIsRolling(state);
    if (setIsRolling) setIsRolling(state);
  };
  return (
    <div className="controls-panel glass-dark">
      <div className="turn-indicator">
        <h3>Now it's</h3>
        <div className={`turn-badge bg-${turn}`}>
          {displayName.toUpperCase()}'S
        </div>
        <h3>turn</h3>
      </div>
      
      <div className="dice-section">
        <Dice 
          onRoll={onRoll} 
          disabled={diceRolled || !isMyTurn} 
          forceValue={diceValue}
          rollId={rollId}
          onRollingStateChange={handleRollingStateChange}
        />
        {diceRolled && diceValue && !isRolling && (
          <p className="roll-result">Rolled a {diceValue}!</p>
        )}
        {!diceRolled && !isRolling && (
          <p className="roll-hint">{isMyTurn ? "Click to roll" : "Waiting for opponent..."}</p>
        )}
        {isRolling && (
          <p className="roll-hint">Rolling...</p>
        )}
      </div>
    </div>
  );
};

export default Controls;
