import React from 'react';
import Dice from '../Dice/Dice';
import './Controls.css';
import { COLORS } from '../../utils/constants';

const Controls = ({ turn, diceValue, diceRolled, rollId, onRoll, isMyTurn = true }) => {
  return (
    <div className="controls-panel glass-dark">
      <div className="turn-indicator">
        <h3>Current Turn</h3>
        <div className={`turn-badge bg-${turn}`}>
          {turn.toUpperCase()}
        </div>
      </div>
      
      <div className="dice-section">
        <Dice 
          onRoll={onRoll} 
          disabled={diceRolled || !isMyTurn} 
          forceValue={diceValue}
          rollId={rollId}
        />
        {diceRolled && diceValue && (
          <p className="roll-result">Rolled a {diceValue}!</p>
        )}
        {!diceRolled && (
          <p className="roll-hint">{isMyTurn ? "Click to roll" : "Waiting for opponent..."}</p>
        )}
      </div>
    </div>
  );
};

export default Controls;
