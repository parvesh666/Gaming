import React, { useState, useEffect, useRef } from 'react';
import { playRollSound } from '../../utils/audio';
import './Dice.css';

const Dice = ({ onRoll, disabled, forceValue, boostSix }) => {
  const [rolling, setRolling] = useState(false);
  const [internalValue, setInternalValue] = useState(6);

  const displayValue = forceValue || internalValue;

  const rollDice = () => {
    if (rolling || disabled) return;
    
    // Instead of local animation, just notify parent immediately.
    // Parent will update forceValue (either locally or via server), 
    // which will trigger the useEffect animation.
    if (onRoll) {
       let finalValue = Math.floor(Math.random() * 6) + 1;
       if (boostSix && Math.random() < 0.5) {
         finalValue = 6;
       }
       onRoll(finalValue);
    }
  };

  const renderFace = (val) => {
    const dots = [];
    for (let i = 0; i < val; i++) {
      dots.push(<div key={i} className="dice-dot"></div>);
    }
    return <div className={`dice-face face-${val} dice-value-${val}`}>{dots}</div>;
  };

  // Handle animation and sound for all rolls (local and online)
  const prevForceValue = useRef(forceValue);
  useEffect(() => {
    if (forceValue && forceValue !== prevForceValue.current) {
      setRolling(true);
      playRollSound();
      setInternalValue(forceValue);
      setTimeout(() => {
        setRolling(false);
      }, 600);
    }
    prevForceValue.current = forceValue;
  }, [forceValue]);

  return (
    <div className={`dice-container ${rolling ? 'rolling' : ''} ${disabled && !rolling ? 'disabled' : ''}`} onClick={rollDice}>
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
