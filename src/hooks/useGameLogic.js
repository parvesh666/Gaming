import { useState, useEffect, useRef } from 'react';
import { COLORS, START_INDICES, SAFE_POSITIONS, BOARD_PATH, HOME_STRETCHES } from '../utils/constants';

const initialTokens = Object.values(COLORS).flatMap(color => 
  [0, 1, 2, 3].map(id => ({
    id: `${color}-${id}`,
    color,
    distance: -1 
  }))
);

export const getTokenCoordinates = (token) => {
  if (token.distance === -1) return null;
  if (token.distance === 56) return { row: 8, col: 8 };
  
  if (token.distance >= 51) {
    const stretchIndex = token.distance - 51;
    return HOME_STRETCHES[token.color][stretchIndex];
  }
  
  const start = START_INDICES[token.color];
  const pathIndex = (start + token.distance) % 52;
  return BOARD_PATH[pathIndex];
};

export const useGameLogic = (playerCount = 4, isOnline = false, socket = null, roomId = null) => {
  const activeColors = (() => {
    if (playerCount === 2) return [COLORS.RED, COLORS.YELLOW];
    if (playerCount === 3) return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW];
    return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];
  })();

  const [tokens, setTokens] = useState(() => 
    initialTokens.filter(t => activeColors.includes(t.color))
  );
  const [turn, setTurn] = useState(activeColors[0]);
  const [diceValue, setDiceValue] = useState(null);
  const [diceRolled, setDiceRolled] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const isAnimatingRef = useRef(isAnimating);
  const latestTokens = useRef(tokens);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    latestTokens.current = tokens;
  }, [tokens]);

  useEffect(() => {
    if (isOnline && socket) {
      const handleGameStateUpdate = (newState) => {
        setTurn(newState.turn);
        setDiceValue(newState.diceValue);
        setDiceRolled(newState.diceRolled);
        if (newState.winner) setWinner(newState.winner);
        
        if (!isAnimatingRef.current) {
           setTokens(newState.tokens);
        }
      };

      const handleDiceRolled = ({ val }) => {
        setDiceValue(val);
        setDiceRolled(true);
      };

      const handleTokenMoved = async ({ tokenId, from, to, gameState }) => {
        setIsAnimating(true);
        
        const delay = ms => new Promise(res => setTimeout(res, ms));
        let currentTokens = [...latestTokens.current];
        const tokenIndex = currentTokens.findIndex(t => t.id === tokenId);

        if (tokenIndex !== -1) {
          if (from === -1) {
            currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: 0 };
            setTokens([...currentTokens]);
            await delay(250);
            from = 0;
          }

          for (let d = from + 1; d <= to; d++) {
            currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: d };
            setTokens([...currentTokens]);
            await delay(250);
          }
        }

        // Apply final state from server
        setTokens(gameState.tokens);
        setTurn(gameState.turn);
        setDiceValue(gameState.diceValue);
        setDiceRolled(gameState.diceRolled);
        if (gameState.winner) setWinner(gameState.winner);

        setIsAnimating(false);
      };

      socket.on('game_state_update', handleGameStateUpdate);
      socket.on('dice_rolled', handleDiceRolled);
      socket.on('token_moved', handleTokenMoved);

      return () => {
        socket.off('game_state_update');
        socket.off('dice_rolled');
        socket.off('token_moved');
      };
    }
  }, [isOnline, socket]);

  const nextTurn = (currentTurn) => {
    const nextIndex = (activeColors.indexOf(currentTurn) + 1) % activeColors.length;
    setTurn(activeColors[nextIndex]);
    setDiceValue(null);
    setDiceRolled(false);
  };

  const isValidMove = (token, roll) => {
    if (token.distance === 56) return false;
    if (token.distance === -1) return roll === 6;
    if (token.distance + roll > 56) return false; 
    return true;
  };

  const rollDice = (val) => {
    if (isOnline) {
      if (diceRolled || winner || isAnimating) return;
      socket.emit('request_roll', { roomId });
      return;
    }

    if (diceRolled || winner || isAnimating) return;
    setDiceValue(val);
    setDiceRolled(true);

    const myTokens = tokens.filter(t => t.color === turn);
    const hasValidMove = myTokens.some(t => isValidMove(t, val));
    
    if (!hasValidMove) {
      setTimeout(() => nextTurn(turn), 1000);
    }
  };

  const moveToken = async (tokenId) => {
    if (isOnline) {
      if (!diceRolled || !diceValue || isAnimating) return;
      socket.emit('request_move', { roomId, tokenId });
      return;
    }

    if (!diceRolled || !diceValue || isAnimating) return;
    
    const token = tokens.find(t => t.id === tokenId);
    if (token.color !== turn) return;
    if (!isValidMove(token, diceValue)) return;

    setIsAnimating(true);
    let extraTurn = diceValue === 6;
    const tokenIndex = tokens.findIndex(t => t.id === tokenId);

    let currentDistance = token.distance;
    const targetDistance = currentDistance === -1 ? 0 : currentDistance + diceValue;

    const delay = ms => new Promise(res => setTimeout(res, ms));
    
    let currentTokens = [...tokens];

    if (currentDistance === -1) {
      currentTokens = [...currentTokens];
      currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: 0 };
      setTokens(currentTokens);
      await delay(250);
      currentDistance = 0;
    } else {
      for (let d = currentDistance + 1; d <= targetDistance; d++) {
        currentTokens = [...currentTokens];
        currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: d };
        setTokens(currentTokens);
        await delay(250);
      }
      currentDistance = targetDistance;
    }

    if (currentDistance >= 0 && currentDistance <= 50) {
      const newCoords = getTokenCoordinates(currentTokens[tokenIndex]);
      const isSafe = SAFE_POSITIONS.some(sp => sp.row === newCoords.row && sp.col === newCoords.col);
      
      if (!isSafe) {
        const captured = currentTokens.filter(t => 
          t.color !== turn && 
          t.distance >= 0 && t.distance <= 50 &&
          getTokenCoordinates(t).row === newCoords.row && 
          getTokenCoordinates(t).col === newCoords.col
        );

        if (captured.length > 0) {
          currentTokens = [...currentTokens];
          captured.forEach(capToken => {
            const capIndex = currentTokens.findIndex(t => t.id === capToken.id);
            currentTokens[capIndex] = { ...currentTokens[capIndex], distance: -1 };
          });
          extraTurn = true;
          setTokens(currentTokens);
        }
      }
    }

    const myTokens = currentTokens.filter(t => t.color === turn);
    const hasWon = myTokens.every(t => t.distance === 56);
    
    if (hasWon) {
      setWinner(turn);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(false);

    if (!extraTurn) {
      setTimeout(() => nextTurn(turn), 200);
    } else {
      setTimeout(() => {
        setDiceValue(null);
        setDiceRolled(false);
      }, 200);
    }
  };

  useEffect(() => {
    if (diceRolled && diceValue && !isAnimating && !winner) {
      const myTokens = tokens.filter(t => t.color === turn);
      const validTokens = myTokens.filter(t => isValidMove(t, diceValue));
      
      if (validTokens.length === 1) {
        const timer = setTimeout(() => {
          moveToken(validTokens[0].id);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [diceRolled, diceValue, turn, isAnimating, winner, isOnline, tokens]);

  return {
    tokens,
    turn,
    diceValue,
    diceRolled,
    winner,
    rollDice,
    moveToken,
    isValidMove,
    activeColors
  };
};
