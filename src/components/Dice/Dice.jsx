import React, { useState } from 'react';
import './Dice.css';

const Dice = ({ onRoll, disabled, forceValue, boostSix }) => {
  const [rolling, setRolling] = useState(false);
  const [internalValue, setInternalValue] = useState(6);

  const displayValue = forceValue || internalValue;

  const rollDice = () => {
    if (rolling || disabled) return;
    setRolling(true);
    
    // Calculate final value immediately
    let finalValue = Math.floor(Math.random() * 6) + 1;
    // Boost chances of rolling a 6 if requested (~58% overall chance)
    if (boostSix && Math.random() < 0.5) {
      finalValue = 6;
    }

    // Let the 3D CSS animation run for 600ms, then snap to the result
    setTimeout(() => {
      setInternalValue(finalValue);
      setRolling(false);
      if (onRoll) onRoll(finalValue);
    }, 600);
  };

  const renderFace = (val) => {
    const dots = [];
    for (let i = 0; i < val; i++) {
      dots.push(<div key={i} className="dice-dot"></div>);
    }
    return <div className={`dice-face face-${val} dice-value-${val}`}>{dots}</div>;
  };

  return (
    <div className={`dice-container ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`} onClick={rollDice}>
      <div className={`dice-cube show-${displayValue}`}>
        {renderFace(1)}
        {renderFace(2)}
        {renderFace(3)}
        {renderFace(4)}
        {renderFace(5)}
        {renderFace(6)}
      </div>
    </div>
  );
};

export default Dice;
