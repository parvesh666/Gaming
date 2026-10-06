const { COLORS, START_INDICES, SAFE_POSITIONS, BOARD_PATH, HOME_STRETCHES } = require('./constants');

class LudoGame {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.activeColors = this.getActiveColors(playerCount);
    this.tokens = this.getInitialTokens();
    this.turn = this.activeColors[0];
    this.diceValue = null;
    this.diceRolled = false;
    // Legacy single-winner field kept for 2p compatibility
    this.winner = null;
    // Ordered list of players who have finished (1st place first)
    this.winners = [];
    this.consecutiveSixes = 0;
    this.missedTurns = {};
  }

  getActiveColors(count) {
    if (count === 2) return [COLORS.RED, COLORS.YELLOW];
    if (count === 3) return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW];
    return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];
  }

  getInitialTokens() {
    const allTokens = Object.values(COLORS).flatMap(color =>
      [0, 1, 2, 3].map(id => ({
        id: `${color}-${id}`,
        color,
        distance: -1
      }))
    );
    return allTokens.filter(t => this.activeColors.includes(t.color));
  }

  getTokenCoordinates(token) {
    if (token.distance === -1) return null;
    if (token.distance === 56) return { row: 8, col: 8 };

    if (token.distance >= 51) {
      const stretchIndex = token.distance - 51;
      return HOME_STRETCHES[token.color][stretchIndex];
    }

    const start = START_INDICES[token.color];
    const pathIndex = (start + token.distance) % 52;
    return BOARD_PATH[pathIndex];
  }

  // Colors still in the race (not yet finished)
  getRemainingColors() {
    return this.activeColors.filter(c => !this.winners.includes(c));
  }

  nextTurn() {
    const remaining = this.getRemainingColors();
    if (remaining.length === 0) return;
    const currentIndex = remaining.indexOf(this.turn);
    const nextIndex = (currentIndex + 1) % remaining.length;
    this.turn = remaining[nextIndex];
    this.diceValue = null;
    this.diceRolled = false;
    this.consecutiveSixes = 0;
  }

  removePlayer(color) {
    this.tokens = this.tokens.filter(t => t.color !== color);

    const index = this.activeColors.indexOf(color);
    if (index !== -1) {
      this.activeColors.splice(index, 1);

      const remaining = this.getRemainingColors();
      if (remaining.length <= 1) {
        // Game over – the last remaining player is the final loser (or sole survivor)
        this.winner = remaining.length === 1 ? remaining[0] : null;
      } else if (this.turn === color) {
        this.turn = remaining[index % remaining.length] || remaining[0];
        this.diceValue = null;
        this.diceRolled = false;
        this.consecutiveSixes = 0;
      }
    }
  }

  // Check if there's an opponent block (2+ same-color tokens from a DIFFERENT color) at a board position
  isBlockedAt(row, col, movingColor) {
    const tokensHere = this.tokens.filter(t => {
      if (t.color === movingColor) return false; // Own tokens never block yourself
      if (t.distance < 0 || t.distance > 50) return false;
      const coords = this.getTokenCoordinates(t);
      return coords && coords.row === row && coords.col === col;
    });

    const byColor = {};
    tokensHere.forEach(t => {
      byColor[t.color] = (byColor[t.color] || 0) + 1;
    });

    return Object.values(byColor).some(c => c >= 2);
  }

  isValidMove(token, roll) {
    if (token.distance === 56) return false;
    if (token.distance === -1) {
      if (roll !== 6) return false;
      // Check if starting position is blocked by opponent double tokens
      const startCoords = this.getTokenCoordinates({ ...token, distance: 0 });
      if (startCoords && this.isBlockedAt(startCoords.row, startCoords.col, token.color)) {
        return false;
      }
      return true;
    }
    if (token.distance + roll > 56) return false;

    // Only check the FINAL landing cell for an opponent doublet block.
    // Tokens are allowed to pass THROUGH a stack — they just can't LAND on one.
    const finalDistance = token.distance + roll;
    if (finalDistance <= 50) {
      const finalCoords = this.getTokenCoordinates({ ...token, distance: finalDistance });
      if (finalCoords && this.isBlockedAt(finalCoords.row, finalCoords.col, token.color)) {
        return false;
      }
    }

    return true;
  }

  rollDice(requestedByColor, isAuto = false) {
    if (this.diceRolled) return null;
    // Block rolls if game is fully over
    if (this.winner) return null;
    if (requestedByColor !== this.turn) return null;
    // Skip finished players (shouldn't happen but guard anyway)
    if (this.winners.includes(requestedByColor)) return null;

    if (isAuto) {
      this.missedTurns[requestedByColor] = (this.missedTurns[requestedByColor] || 0) + 1;
      if (this.missedTurns[requestedByColor] >= 3) {
        this.removePlayer(requestedByColor);
        return { kicked: true, color: requestedByColor };
      }
    } else {
      this.missedTurns[requestedByColor] = 0;
    }

    // Slight boost for 6 → ~21% total chance
    let val = Math.floor(Math.random() * 6) + 1;
    if (val !== 6 && Math.random() < 0.055) {
      val = 6;
    }

    this.diceValue = val;
    this.diceRolled = true;

    if (val === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes >= 3) {
        return { val, hasValidMove: false, threeSixesPenalty: true };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const myTokens = this.tokens.filter(t => t.color === this.turn);
    const hasValidMove = myTokens.some(t => this.isValidMove(t, val));

    return { val, hasValidMove, threeSixesPenalty: false };
  }

  moveToken(tokenId, requestedByColor) {
    if (!this.diceRolled || !this.diceValue) return false;

    const token = this.tokens.find(t => t.id === tokenId);
    if (!token || token.color !== this.turn || requestedByColor !== this.turn) return false;
    if (!this.isValidMove(token, this.diceValue)) return false;

    let extraTurn = this.diceValue === 6;

    token.distance = token.distance === -1 ? 0 : token.distance + this.diceValue;

    if (token.distance >= 0 && token.distance <= 50) {
      const newCoords = this.getTokenCoordinates(token);
      const isSafe = SAFE_POSITIONS.some(sp => sp.row === newCoords.row && sp.col === newCoords.col);

      if (!isSafe) {
        const captured = this.tokens.filter(t =>
          t.color !== this.turn &&
          t.distance >= 0 && t.distance <= 50 &&
          this.getTokenCoordinates(t).row === newCoords.row &&
          this.getTokenCoordinates(t).col === newCoords.col
        );

        if (captured.length > 0) {
          captured.forEach(capToken => {
            capToken.distance = -1;
          });
          extraTurn = true;
        }
      }
    }

    if (token.distance === 56) {
      extraTurn = true;
    }

    const myTokens = this.tokens.filter(t => t.color === this.turn);
    const hasWon = myTokens.every(t => t.distance === 56);

    let gameOver = false;
    let finishedColor = null;

    if (hasWon) {
      finishedColor = this.turn;
      this.winners.push(this.turn);

      const remaining = this.getRemainingColors();

      if (this.playerCount === 2) {
        // 2-player: game ends immediately when first player wins
        this.winner = this.turn;
        gameOver = true;
      } else {
        // 3p/4p: game ends when only 1 player left (they're the loser)
        if (remaining.length <= 1) {
          this.winner = this.winners[0]; // 1st place wins the "game"
          gameOver = true;
        } else {
          // Winner's turn is over; advance to next remaining player
          extraTurn = false;
          this.nextTurn();
        }
      }
    }

    return { extraTurn, hasWon, gameOver, finishedColor, winners: [...this.winners] };
  }

  getState() {
    return {
      tokens: this.tokens,
      turn: this.turn,
      diceValue: this.diceValue,
      diceRolled: this.diceRolled,
      winner: this.winner,
      winners: this.winners,
      activeColors: this.activeColors,
      consecutiveSixes: this.consecutiveSixes,
      missedTurns: this.missedTurns
    };
  }
}

module.exports = LudoGame;
