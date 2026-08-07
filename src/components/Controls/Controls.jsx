import React from 'react';
import Dice from '../Dice/Dice';
import './Controls.css';
import { COLORS } from '../../utils/constants';

const Controls = ({ turn, diceValue, diceRolled, onRoll, boostSix }) => {
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
          disabled={diceRolled} 
          forceValue={diceValue}
          boostSix={boostSix}
        />
        {diceRolled && diceValue && (
          <p className="roll-result">Rolled a {diceValue}!</p>
        )}
        {!diceRolled && (
          <p className="roll-hint">Click to roll</p>
        )}
      </div>
    </div>
  );
};

export default Controls;
