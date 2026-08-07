import React from 'react';
import './Board.css';
import PlayerBase from '../PlayerBase/PlayerBase';
import Home from '../Home/Home';
import PathCell from '../PathCell/PathCell';
import Token from '../Token/Token';
import { COLORS, isPathCell } from '../../utils/constants';
import { getTokenCoordinates } from '../../hooks/useGameLogic';

const Board = ({ tokens, turn, diceValue, diceRolled, onMoveToken, isValidMove, activeColors }) => {
  const renderPathCells = () => {
    const cells = [];
    for (let row = 1; row <= 15; row++) {
      for (let col = 1; col <= 15; col++) {
        if (isPathCell(row, col)) {
          cells.push(<PathCell key={`${row}-${col}`} row={row} col={col} />);
        }
      }
    }
    return cells;
  };

  const renderActiveTokens = () => {
    if (!tokens) return null;

    const grouped = {};
    
    tokens
      .filter(t => t.distance >= 0 && t.distance < 56)
      .forEach(token => {
        const coords = getTokenCoordinates(token);
        if (!coords) return;
        const key = `${coords.row}-${coords.col}`;
        if (!grouped[key]) grouped[key] = { coords, tokens: [] };
        grouped[key].tokens.push(token);
      });

    return Object.values(grouped).map(group => {
      const { coords, tokens: cellTokens } = group;
      const isMulti = cellTokens.length > 1;

      return (
        <div 
          key={`${coords.row}-${coords.col}`} 
          className={`board-token-wrapper ${isMulti ? 'multi-token' : ''}`}
          style={{ 
            gridRow: coords.row, 
            gridColumn: coords.col,
            zIndex: 20
          }}
        >
          {cellTokens.map((token, idx) => {
            const isClickable = turn === token.color && diceRolled && isValidMove(token, diceValue);
            return (
              <div key={token.id} className="token-container" style={{ zIndex: 10 + idx }}>
                <Token 
                  color={token.color}
                  onClick={() => isClickable && onMoveToken(token.id)}
                  highlight={isClickable}
                />
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="board-wrapper glass">
      <div className="ludo-board">
        {/* The 4 Player Bases */}
        <PlayerBase color={COLORS.RED} position="top-left" tokens={tokens} turn={turn} diceRolled={diceRolled} diceValue={diceValue} onMoveToken={onMoveToken} isValidMove={isValidMove} activeColors={activeColors} />
        <PlayerBase color={COLORS.GREEN} position="top-right" tokens={tokens} turn={turn} diceRolled={diceRolled} diceValue={diceValue} onMoveToken={onMoveToken} isValidMove={isValidMove} activeColors={activeColors} />
        <PlayerBase color={COLORS.BLUE} position="bottom-left" tokens={tokens} turn={turn} diceRolled={diceRolled} diceValue={diceValue} onMoveToken={onMoveToken} isValidMove={isValidMove} activeColors={activeColors} />
        <PlayerBase color={COLORS.YELLOW} position="bottom-right" tokens={tokens} turn={turn} diceRolled={diceRolled} diceValue={diceValue} onMoveToken={onMoveToken} isValidMove={isValidMove} activeColors={activeColors} />
        
        {/* The Center Home */}
        <Home />
        
        {/* All Path Cells */}
        {renderPathCells()}
        
        {/* Active Tokens on Path */}
        {renderActiveTokens()}
      </div>
    </div>
  );
};

export default Board;
