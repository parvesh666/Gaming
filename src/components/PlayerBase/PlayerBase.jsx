import React from 'react';
import './PlayerBase.css';
import Token from '../Token/Token';

const PlayerBase = ({ color, position, tokens, turn, diceRolled, diceValue, onMoveToken, isValidMove, activeColors }) => {
  const isActive = activeColors.includes(color);
  const baseTokens = isActive && tokens ? tokens.filter(t => t.color === color && t.distance === -1) : [];
  // Determine grid area based on position
  let gridArea = '';
  switch (position) {
    case 'top-left':
      gridArea = '1 / 1 / 7 / 7';
      break;
    case 'top-right':
      gridArea = '1 / 10 / 7 / 16';
      break;
    case 'bottom-left':
      gridArea = '10 / 1 / 16 / 7';
      break;
    case 'bottom-right':
      gridArea = '10 / 10 / 16 / 16';
      break;
    default:
      break;
  }

  return (
    <div 
      className={`player-base base-${color} ${!isActive ? 'inactive' : ''}`} 
      style={{ gridArea }}
    >
      <div className="base-inner">
        {isActive && [0, 1, 2, 3].map((i) => {
          const token = baseTokens[i];
          const isMyTurn = turn === color;
          const isClickable = token && isMyTurn && diceRolled && isValidMove(token, diceValue);
          
          return (
            <div key={i} className="token-slot">
              {token && (
                <Token 
                  color={color} 
                  onClick={() => isClickable && onMoveToken(token.id)}
                  highlight={isClickable}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerBase;
