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
  // Legacy winner field (used for 2p end condition or final game-over)
  const [winner, setWinner] = useState(null);
  // Ordered podium — colors in finish order; used in 3p/4p
  const [winners, setWinners] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [missedTurns, setMissedTurns] = useState({});

  const isAnimatingRef = useRef(isAnimating);
  const latestTokens = useRef(tokens);
  const winnersRef = useRef(winners);

  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { latestTokens.current = tokens; }, [tokens]);
  useEffect(() => { winnersRef.current = winners; }, [winners]);

  // Reset game state when playerCount changes
  useEffect(() => {
    const newActiveColors = getActiveColorsForCount(playerCount);
    setActiveColors(newActiveColors);
    setTokens(initialTokens.filter(t => newActiveColors.includes(t.color)));
    setTurn(newActiveColors[0]);
    setDiceValue(null);
    setDiceRolled(false);
    setWinner(null);
    setWinners([]);
    setConsecutiveSixes(0);
    setMissedTurns({});
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
    if (isOnline && myColor) {
      if (turn === myColor) playTurnSound();
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
          setRollId(prev => prev + 1);
        }
        if (newState.winner) setWinner(newState.winner);
        if (newState.winners) setWinners(newState.winners);
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
        if (gameState.winners) setWinners(gameState.winners);
        if (gameState.activeColors) setActiveColors(gameState.activeColors);
        if (gameState.missedTurns) setMissedTurns(gameState.missedTurns);

        setIsAnimating(false);
      };

      const handlePlayerFinished = ({ color, position, winners: newWinners }) => {
        setWinners(newWinners);
        if (position === 1) playWinSound();
      };

      socket.on('game_state_update', handleGameStateUpdate);
      socket.on('dice_rolled', handleDiceRolled);
      socket.on('token_moved', handleTokenMoved);
      socket.on('player_finished', handlePlayerFinished);

      return () => {
        socket.off('game_state_update', handleGameStateUpdate);
        socket.off('dice_rolled', handleDiceRolled);
        socket.off('token_moved', handleTokenMoved);
        socket.off('player_finished', handlePlayerFinished);
      };
    }
  }, [isOnline, socket]);

  // Returns colors that haven't finished yet
  const getRemainingColors = (currentActiveColors, currentWinners) => {
    return currentActiveColors.filter(c => !currentWinners.includes(c));
  };

  const nextTurn = (currentTurn, currentActiveColors, currentWinners) => {
    const remaining = getRemainingColors(currentActiveColors, currentWinners);
    if (remaining.length === 0) return;
    const currentIndex = remaining.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % remaining.length;
    setTurn(remaining[nextIndex]);
    setDiceValue(null);
    setDiceRolled(false);
    setConsecutiveSixes(0);
  };

  const removePlayerLocal = (colorToRemove) => {
    const index = activeColors.indexOf(colorToRemove);
    if (index !== -1) {
      const newActiveColors = [...activeColors];
      newActiveColors.splice(index, 1);
      setActiveColors(newActiveColors);
      setTokens(prev => prev.filter(t => t.color !== colorToRemove));

      const remaining = getRemainingColors(newActiveColors, winnersRef.current);
      if (remaining.length <= 1) {
        setWinner(remaining.length === 1 ? remaining[0] : newActiveColors[0]);
      } else if (turn === colorToRemove) {
        const fallbackIdx = index % remaining.length;
        setTurn(remaining[fallbackIdx] || remaining[0]);
        setDiceValue(null);
        setDiceRolled(false);
        setConsecutiveSixes(0);
      }
    }
  };

  // Check if there's an opponent block (2+ same-color tokens from a DIFFERENT color) at a board position
  const isBlockedAt = (row, col, movingColor) => {
    const tokensHere = tokens.filter(t => {
      if (t.color === movingColor) return false; // Own tokens never block yourself
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
      const startCoords = getTokenCoordinates({ ...token, distance: 0 });
      if (startCoords && isBlockedAt(startCoords.row, startCoords.col, token.color)) {
        return false;
      }
      return true;
    }
    if (token.distance + roll > 56) return false;

    // Only check the FINAL landing cell for an opponent doublet block.
    const finalDistance = token.distance + roll;
    if (finalDistance <= 50) {
      const finalCoords = getTokenCoordinates({ ...token, distance: finalDistance });
      if (finalCoords && isBlockedAt(finalCoords.row, finalCoords.col, token.color)) {
        return false;
      }
    }

    return true;
  };

  const rollDice = (val, isAuto = false) => {
    if (isOnline) {
      if (diceRolled || winner || isAnimating) return;
      if (myColor && turn !== myColor) return;
      socket.emit('request_roll', { roomId, isAuto });
      return;
    }

    if (diceRolled || winner || isAnimating) return;
    // Don't allow a finished player to roll
    if (winners.includes(turn)) return;

    if (isAuto) {
      const newMissed = (missedTurns[turn] || 0) + 1;
      if (newMissed >= 3) {
        removePlayerLocal(turn);
        return;
      }
      setMissedTurns(prev => ({ ...prev, [turn]: newMissed }));
    } else {
      setMissedTurns(prev => ({ ...prev, [turn]: 0 }));
    }

    // ~21% chance for 6
    let finalVal = val;
    if (finalVal !== 6 && Math.random() < 0.055) {
      finalVal = 6;
    }

    setDiceValue(finalVal);
    setDiceRolled(true);

    if (finalVal === 6) {
      const newCount = consecutiveSixes + 1;
      setConsecutiveSixes(newCount);
      if (newCount >= 3) {
        setTimeout(() => nextTurn(turn, activeColors, winners), 1000);
        return;
      }
    } else {
      setConsecutiveSixes(0);
    }

    const myTokens = tokens.filter(t => t.color === turn);
    const hasValidMove = myTokens.some(t => isValidMove(t, finalVal));

    if (!hasValidMove) {
      setTimeout(() => nextTurn(turn, activeColors, winners), 1000);
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
      const newWinners = [...winners, turn];
      setWinners(newWinners);
      setIsAnimating(false);

      if (playerCount === 2) {
        // 2-player: end game immediately
        setWinner(turn);
        return;
      }

      // 3p/4p: check if game is over (only 1 left)
      const remaining = getRemainingColors(activeColors, newWinners);
      if (remaining.length <= 1) {
        setWinner(newWinners[0]); // 1st-place winner is "the winner"
        return;
      }

      // Game continues — skip this player's extra turn, go to next remaining
      setIsAnimating(false);
      setTimeout(() => nextTurn(turn, activeColors, newWinners), 200);
      return;
    }

    setIsAnimating(false);

    if (!extraTurn) {
      setTimeout(() => nextTurn(turn, activeColors, winners), 200);
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
      if (isOnline && (!myColor || turn !== myColor)) return;
      // Don't auto-move for a finished player
      if (winners.includes(turn)) return;

      const myTokens = tokens.filter(t => t.color === turn);
      const validTokens = myTokens.filter(t => isValidMove(t, diceValue));

      if (validTokens.length === 1) {
        const timer = setTimeout(() => {
          moveToken(validTokens[0].id);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [diceRolled, diceValue, turn, isAnimating, winner, isOnline, tokens, winners]);

  // Auto-roll dice after 30 seconds if the player doesn't roll
  useEffect(() => {
    if (!diceRolled && !winner && !isAnimating) {
      if (isOnline && (!myColor || turn !== myColor)) return;
      // Don't auto-roll for a finished player
      if (winners.includes(turn)) return;

      const timer = setTimeout(() => {
        let autoRoll = Math.floor(Math.random() * 6) + 1;
        if (autoRoll !== 6 && Math.random() < 0.055) autoRoll = 6;
        rollDice(autoRoll, true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [diceRolled, turn, winner, isAnimating, isOnline, myColor, missedTurns, winners]);

  return {
    tokens,
    turn,
    diceValue,
    diceRolled,
    rollId,
    winner,
    winners,
    rollDice,
    moveToken,
    isValidMove,
    activeColors,
    missedTurns
  };
};
