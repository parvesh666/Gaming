import { useState, useEffect, useRef } from 'react';
import { COLORS, START_INDICES, SAFE_POSITIONS, BOARD_PATH, HOME_STRETCHES } from '../utils/constants';
import { playRollSound, playMoveSound, playCaptureSound, playGoalSound, playWinSound, playTurnSound } from '../utils/audio';

const initialTokens = Object.values(COLORS).flatMap(color => 
  [0, 1, 2, 3].map(id => ({
    id: `${color}-${id}`,
    color,
    distance: -1 
  }))
);

export const getTokenCoordinates = (token) => {
  if (token.distance === -1) return null;
  if (token.distance === 56) {
    if (token.color === COLORS.RED) return { row: 8, col: 7 };
    if (token.color === COLORS.GREEN) return { row: 7, col: 8 };
    if (token.color === COLORS.YELLOW) return { row: 8, col: 9 };
    if (token.color === COLORS.BLUE) return { row: 9, col: 8 };
  }
  
  if (token.distance >= 51) {
    const stretchIndex = token.distance - 51;
    return HOME_STRETCHES[token.color][stretchIndex];
  }
  
  const start = START_INDICES[token.color];
  const pathIndex = (start + token.distance) % 52;
  return BOARD_PATH[pathIndex];
};

const getActiveColorsForCount = (count) => {
  if (count === 2) return [COLORS.RED, COLORS.YELLOW];
  if (count === 3) return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW];
  return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];
};

export const useGameLogic = (playerCount = 4, isOnline = false, socket = null, roomId = null, myColor = null) => {
  const [activeColors, setActiveColors] = useState(() => getActiveColorsForCount(playerCount));

  const [tokens, setTokens] = useState(() => 
    initialTokens.filter(t => activeColors.includes(t.color))
  );
  const [turn, setTurn] = useState(activeColors[0]);
  const [diceValue, setDiceValue] = useState(null);
  const [diceRolled, setDiceRolled] = useState(false);
  const [rollId, setRollId] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);

  const isAnimatingRef = useRef(isAnimating);
  const latestTokens = useRef(tokens);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    latestTokens.current = tokens;
  }, [tokens]);

  // Reset game state when playerCount changes (fixes 2P/3P showing 4 players)
  useEffect(() => {
    const newActiveColors = getActiveColorsForCount(playerCount);
    setActiveColors(newActiveColors);
    setTokens(initialTokens.filter(t => newActiveColors.includes(t.color)));
    setTurn(newActiveColors[0]);
    setDiceValue(null);
    setDiceRolled(false);
    setWinner(null);
    setConsecutiveSixes(0);
    setIsAnimating(false);
  }, [playerCount]);

  // Play turn sound when it becomes our turn
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (winner) return;
    
    // In online mode, only ping if it's our turn. In local mode, ping for every turn change.
    if (isOnline && myColor) {
      if (turn === myColor) {
        playTurnSound();
      }
    } else if (!isOnline) {
      playTurnSound();
    }
  }, [turn, isOnline, myColor, winner]);

  useEffect(() => {
    if (isOnline && socket) {
      const handleGameStateUpdate = (newState) => {
        setTurn(newState.turn);
        setDiceValue(newState.diceValue);
        setDiceRolled(newState.diceRolled);
        if (newState.diceRolled && !newState.previousDiceRolled) {
          // If server sends a new roll state
          setRollId(prev => prev + 1);
        }
        if (newState.winner) setWinner(newState.winner);
        if (newState.activeColors) setActiveColors(newState.activeColors);
        
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
            currentTokens = [...currentTokens];
            currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: 0 };
            setTokens(currentTokens);
            playMoveSound();
            await delay(250);
            from = 0;
          }

          for (let d = from + 1; d <= to; d++) {
            currentTokens = [...currentTokens];
            currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: d };
            setTokens(currentTokens);
            playMoveSound();
            await delay(250);
          }
        }

        // Detect captures and goals from state change
        const oldTokens = latestTokens.current;
        let didCapture = false;
        let didGoal = false;
        gameState.tokens.forEach(nt => {
          const ot = oldTokens.find(t => t.id === nt.id);
          if (ot && ot.distance >= 0 && nt.distance === -1) didCapture = true;
          if (ot && ot.distance < 56 && nt.distance === 56) didGoal = true;
        });
        if (didCapture) playCaptureSound();
        if (didGoal) playGoalSound();

        // Apply final state from server
        setTokens(gameState.tokens);
        setTurn(gameState.turn);
        setDiceValue(gameState.diceValue);
        setDiceRolled(gameState.diceRolled);
        if (gameState.winner) {
          if (!winner) playWinSound();
          setWinner(gameState.winner);
        }
        if (gameState.activeColors) setActiveColors(gameState.activeColors);

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
    setConsecutiveSixes(0);
  };

  // Check if there's an opponent block (2+ same-color tokens) at a board position
  const isBlockedAt = (row, col, movingColor) => {
    const tokensHere = tokens.filter(t => {
      if (t.color === movingColor) return false;
      if (t.distance < 0 || t.distance > 50) return false;
      const coords = getTokenCoordinates(t);
      return coords && coords.row === row && coords.col === col;
    });
    
    const byColor = {};
    tokensHere.forEach(t => {
      byColor[t.color] = (byColor[t.color] || 0) + 1;
    });
    
    return Object.values(byColor).some(c => c >= 2);
  };

  const isValidMove = (token, roll) => {
    if (token.distance === 56) return false;
    if (token.distance === -1) {
      if (roll !== 6) return false;
      // Check if starting position is blocked by opponent double tokens
      const startCoords = getTokenCoordinates({ ...token, distance: 0 });
      if (startCoords && isBlockedAt(startCoords.row, startCoords.col, token.color)) {
        return false;
      }
      return true;
    }
    if (token.distance + roll > 56) return false;

    // Check each square along the path for opponent blocks (can't land on or pass through)
    for (let d = token.distance + 1; d <= token.distance + roll; d++) {
      if (d > 50) break; // Home stretch - no opponent blocks possible
      const tempCoords = getTokenCoordinates({ ...token, distance: d });
      if (tempCoords && isBlockedAt(tempCoords.row, tempCoords.col, token.color)) {
        return false;
      }
    }

    return true;
  };

  const rollDice = (val) => {
    if (isOnline) {
      if (diceRolled || winner || isAnimating) return;
      if (myColor && turn !== myColor) return;
      socket.emit('request_roll', { roomId });
      return;
    }

    if (diceRolled || winner || isAnimating) return;
    setDiceValue(val);
    setDiceRolled(true);

    // Three consecutive sixes penalty
    if (val === 6) {
      const newCount = consecutiveSixes + 1;
      setConsecutiveSixes(newCount);
      if (newCount >= 3) {
        // Forfeit turn - three sixes in a row
        setTimeout(() => nextTurn(turn), 1000);
        return;
      }
    } else {
      setConsecutiveSixes(0);
    }

    const myTokens = tokens.filter(t => t.color === turn);
    const hasValidMove = myTokens.some(t => isValidMove(t, val));
    
    if (!hasValidMove) {
      setTimeout(() => nextTurn(turn), 1000);
    }
  };

  const moveToken = async (tokenId) => {
    if (isOnline) {
      if (!diceRolled || !diceValue || isAnimating) return;
      if (myColor && turn !== myColor) return;
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
      playMoveSound();
      await delay(250);
      currentDistance = 0;
    } else {
      for (let d = currentDistance + 1; d <= targetDistance; d++) {
        currentTokens = [...currentTokens];
        currentTokens[tokenIndex] = { ...currentTokens[tokenIndex], distance: d };
        setTokens(currentTokens);
        playMoveSound();
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
          playCaptureSound();
        }
      }
    }

    if (targetDistance === 56) {
      playGoalSound();
      extraTurn = true;
    }

    const myTokens = currentTokens.filter(t => t.color === turn);
    const hasWon = myTokens.every(t => t.distance === 56);
    
    if (hasWon) {
      playWinSound();
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

  // Auto-move when only one valid token can move
  useEffect(() => {
    if (diceRolled && diceValue && !isAnimating && !winner) {
      // In online mode, only auto-move for own turn
      if (isOnline && myColor && turn !== myColor) return;

      const myTokens = tokens.filter(t => t.color === turn);
      const validTokens = myTokens.filter(t => isValidMove(t, diceValue));
      
      if (validTokens.length === 1) {
        const timer = setTimeout(() => {
          moveToken(validTokens[0].id);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [diceRolled, diceValue, turn, isAnimating, winner, isOnline, tokens]);

  // Auto-roll dice after 40 seconds if the player doesn't roll
  useEffect(() => {
    if (!diceRolled && !winner && !isAnimating) {
      if (isOnline && myColor && turn !== myColor) {
        return; // Wait for opponent's client to trigger their own auto-roll
      }

      const timer = setTimeout(() => {
        // Pass a random value for local mode. Online mode ignores the arg and requests server.
        rollDice(Math.floor(Math.random() * 6) + 1);
      }, 40000);

      return () => clearTimeout(timer);
    }
  }, [diceRolled, turn, winner, isAnimating, isOnline, myColor]);

  return {
    tokens,
    turn,
    diceValue,
    diceRolled,
    rollId,
    winner,
    rollDice,
    moveToken,
    isValidMove,
    activeColors
  };
};
